'use client';

import { useState, useEffect, useCallback } from 'react';
import { useFlowstack } from '../context/FlowstackProvider';
import type { SiteVersion, SiteVersionManifest, UseSiteVersionsReturn } from '../types';
import {
  getSiteVersions as apiGetVersions,
  promoteSiteVersion as apiPromote,
  deleteSiteVersion as apiDeleteVersion,
} from '../api/client';

function normalizeVersion(raw: Record<string, unknown>): SiteVersion {
  return {
    version: (raw.version || 0) as number,
    type: (raw.type || 'build') as SiteVersion['type'],
    createdAt: (raw.created_at || raw.createdAt || '') as string,
    description: (raw.description) as string | undefined,
    fileCount: (raw.file_count || raw.fileCount || 0) as number,
    totalBytes: (raw.total_bytes || raw.totalBytes || 0) as number,
    url: (raw.url || '') as string,
  };
}

function normalizeManifest(raw: Record<string, unknown>): SiteVersionManifest {
  const versions = raw.versions as Record<string, unknown>[] | undefined;
  return {
    siteId: (raw.site_id || raw.siteId || '') as string,
    name: (raw.name || '') as string,
    liveVersion: (raw.live_version || raw.liveVersion || 1) as number,
    versions: (versions || []).map(normalizeVersion),
    alias: (raw.alias ?? null) as string | null,
    githubRepo: (raw.github_repo || raw.githubRepo || null) as SiteVersionManifest['githubRepo'],
  };
}

export function useSiteVersions(siteId: string | null): UseSiteVersionsReturn {
  const { credentials, config } = useFlowstack();

  const [versions, setVersions] = useState<SiteVersion[]>([]);
  const [liveVersion, setLiveVersion] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientConfig = {
    baseUrl: config.baseUrl,
    tenantId: config.tenantId,
  };

  const refresh = useCallback(async () => {
    if (!siteId || !credentials) return;
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiGetVersions(credentials, siteId, clientConfig);
      if (response.ok && response.data) {
        const manifest = normalizeManifest(response.data as unknown as Record<string, unknown>);
        setVersions(manifest.versions);
        setLiveVersion(manifest.liveVersion);
      } else {
        setError(response.error || 'Failed to load versions');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load versions');
    } finally {
      setIsLoading(false);
    }
  }, [siteId, credentials, config.baseUrl]);

  useEffect(() => {
    if (siteId) {
      refresh();
    } else {
      setVersions([]);
      setLiveVersion(null);
      setError(null);
    }
  }, [siteId, refresh]);

  const promote = useCallback(async (version: number): Promise<boolean> => {
    if (!siteId || !credentials) return false;
    setError(null);

    try {
      const response = await apiPromote(credentials, siteId, version, clientConfig);
      if (response.ok && response.data) {
        const manifest = normalizeManifest(response.data as unknown as Record<string, unknown>);
        setVersions(manifest.versions);
        setLiveVersion(manifest.liveVersion);
        return true;
      }
      setError(response.error || 'Failed to promote version');
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to promote version');
      return false;
    }
  }, [siteId, credentials, config.baseUrl]);

  const deleteVersion = useCallback(async (version: number): Promise<boolean> => {
    if (!siteId || !credentials) return false;
    setError(null);

    try {
      const response = await apiDeleteVersion(credentials, siteId, version, clientConfig);
      if (response.ok && response.data) {
        const manifest = normalizeManifest(response.data as unknown as Record<string, unknown>);
        setVersions(manifest.versions);
        setLiveVersion(manifest.liveVersion);
        return true;
      }
      setError(response.error || 'Failed to delete version');
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete version');
      return false;
    }
  }, [siteId, credentials, config.baseUrl]);

  return {
    versions,
    liveVersion,
    isLoading,
    error,
    promote,
    deleteVersion,
    refresh,
  };
}
