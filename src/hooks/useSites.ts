'use client';

/**
 * useSites Hook
 *
 * Provides published site management — list, create, stage files, publish to CDN, delete.
 *
 * @example
 * ```tsx
 * function SiteManager() {
 *   const { sites, createSite, deleteSite, isLoading } = useSites();
 *
 *   return (
 *     <div>
 *       {sites.map(site => (
 *         <div key={site.id}>
 *           <a href={site.url}>{site.name}</a>
 *           <button onClick={() => deleteSite(site.id)}>Delete</button>
 *         </div>
 *       ))}
 *       <button onClick={() => createSite({
 *         name: 'My Site',
 *         files: { 'index.html': '<html>Hello</html>' }
 *       })}>
 *         Quick Publish
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */

import { useState, useEffect, useCallback } from 'react';
import { useFlowstack } from '../context/FlowstackProvider';
import type { PublishedSiteInfo, UseSitesReturn, CreateSiteParams } from '../types';
import {
  listSites as apiListSites,
  createSite as apiCreateSite,
  addSiteFile as apiAddSiteFile,
  publishStagedSite as apiPublishStagedSite,
  deleteSite as apiDeleteSite,
} from '../api/client';

/**
 * Hook for published site management
 */
export function useSites(): UseSitesReturn {
  const { credentials, config } = useFlowstack();

  const [sites, setSites] = useState<PublishedSiteInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMockMode = config.mode === 'mock';
  const clientConfig = {
    baseUrl: config.baseUrl,
    tenantId: config.tenantId,
  };

  /**
   * Normalize backend response to PublishedSiteInfo
   */
  const normalizeSite = (raw: Record<string, unknown>): PublishedSiteInfo => ({
    id: (raw.site_id || raw.id || '') as string,
    name: (raw.site_name || raw.name || '') as string,
    url: (raw.url || '') as string,
    shortUrl: (raw.short_url || raw.shortUrl) as string | undefined,
    siteType: (raw.site_type || raw.siteType || 'on_demand') as PublishedSiteInfo['siteType'],
    fileCount: (raw.file_count || raw.fileCount || 0) as number,
    totalBytes: (raw.total_bytes || raw.totalBytes) as number | undefined,
    createdAt: (raw.created_at || raw.createdAt || '') as string,
    description: (raw.description) as string | undefined,
    metadata: (raw.metadata) as Record<string, unknown> | undefined,
    currentVersion: (raw.current_version || raw.currentVersion) as number | undefined,
    liveVersion: (raw.live_version || raw.liveVersion) as number | undefined,
    subdomainUrl: (raw.subdomain_url || raw.subdomainUrl) as string | undefined,
    alias: (raw.alias ?? undefined) as string | null | undefined,
  });

  /**
   * Refresh the sites list
   */
  const refreshSites = useCallback(async () => {
    if (!credentials && !isMockMode) return;
    setIsLoading(true);
    setError(null);

    try {
      if (isMockMode) {
        setSites([]);
        return;
      }

      const response = await apiListSites(credentials!, clientConfig);
      if (response.ok && response.data) {
        const rawSites = (response.data as Record<string, unknown>).sites as Record<string, unknown>[];
        setSites((rawSites || []).map(normalizeSite));
      } else {
        setError(response.error || 'Failed to load sites');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sites');
    } finally {
      setIsLoading(false);
    }
  }, [credentials, isMockMode, config.baseUrl]);

  // Auto-load on mount
  useEffect(() => {
    refreshSites();
  }, [refreshSites]);

  /**
   * Create a new site. If files provided, publishes immediately.
   */
  const createSite = useCallback(async (params: CreateSiteParams): Promise<PublishedSiteInfo | null> => {
    if (!credentials && !isMockMode) {
      setError('Not authenticated');
      return null;
    }
    setError(null);

    try {
      const response = await apiCreateSite(credentials!, params, clientConfig);
      if (response.ok && response.data) {
        const data = response.data as Record<string, unknown>;
        const site = data.site as Record<string, unknown> | undefined;
        if (site) {
          const normalized = normalizeSite(site);
          setSites(prev => [normalized, ...prev]);
          return normalized;
        }
        // Staging mode — return partial info
        return {
          id: data.site_id as string,
          name: params.name,
          url: '',
          siteType: params.siteType || 'on_demand',
          fileCount: 0,
          createdAt: new Date().toISOString(),
        };
      }
      setError(response.error || 'Failed to create site');
      return null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create site');
      return null;
    }
  }, [credentials, isMockMode, config.baseUrl]);

  /**
   * Add a file to a staged site
   */
  const addFile = useCallback(async (siteId: string, path: string, content: string): Promise<boolean> => {
    if (!credentials) {
      setError('Not authenticated');
      return false;
    }
    setError(null);

    try {
      const response = await apiAddSiteFile(credentials, siteId, path, content, clientConfig);
      return response.ok;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add file');
      return false;
    }
  }, [credentials, config.baseUrl]);

  /**
   * Publish a staged site to CDN
   */
  const publishSite = useCallback(async (siteId: string): Promise<PublishedSiteInfo | null> => {
    if (!credentials) {
      setError('Not authenticated');
      return null;
    }
    setError(null);

    try {
      const response = await apiPublishStagedSite(credentials, siteId, clientConfig);
      if (response.ok && response.data) {
        const site = (response.data as Record<string, unknown>).site as Record<string, unknown>;
        if (site) {
          const normalized = normalizeSite(site);
          await refreshSites();
          return normalized;
        }
      }
      setError(response.error || 'Failed to publish site');
      return null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish site');
      return null;
    }
  }, [credentials, config.baseUrl, refreshSites]);

  /**
   * Delete a published site
   */
  const deleteSite = useCallback(async (siteId: string): Promise<boolean> => {
    if (!credentials) {
      setError('Not authenticated');
      return false;
    }
    setError(null);

    try {
      const response = await apiDeleteSite(credentials, siteId, clientConfig);
      if (response.ok) {
        setSites(prev => prev.filter(s => s.id !== siteId));
        return true;
      }
      setError(response.error || 'Failed to delete site');
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete site');
      return false;
    }
  }, [credentials, config.baseUrl]);

  return {
    sites,
    isLoading,
    error,
    createSite,
    addFile,
    publishSite,
    deleteSite,
    refreshSites,
  };
}
