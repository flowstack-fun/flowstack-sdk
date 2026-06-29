/**
 * useUserCollections — List all MongoDB collections the user owns.
 *
 * Returns collections across all sites, grouped by site ID.
 * Supports optional site_id filtering and schema inclusion.
 */

import { useState, useEffect, useCallback } from 'react';
import { useFlowstack } from '../context/FlowstackProvider';
import { getUserCollections, deleteUserCollection } from '../api/client';
import type { UserCollectionInfo } from '../types';

export interface UseUserCollectionsOptions {
  siteId?: string;
  includeSchema?: boolean;
}

export interface UseUserCollectionsReturn {
  collections: UserCollectionInfo[];
  groupedBySite: Record<string, UserCollectionInfo[]>;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  deleteCollection: (fullName: string) => Promise<boolean>;
}

export function useUserCollections(options?: UseUserCollectionsOptions): UseUserCollectionsReturn {
  const { credentials, config } = useFlowstack();
  const [collections, setCollections] = useState<UserCollectionInfo[]>([]);
  const [groupedBySite, setGroupedBySite] = useState<Record<string, UserCollectionInfo[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clientConfig = { baseUrl: config.baseUrl, tenantId: config.tenantId };

  const refresh = useCallback(async () => {
    if (!credentials) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await getUserCollections(
        credentials,
        { siteId: options?.siteId, includeSchema: options?.includeSchema },
        clientConfig,
      );
      if (res.ok && res.data) {
        setCollections(res.data.collections || []);
        setGroupedBySite(res.data.grouped_by_site || {});
      } else {
        setError(res.error || 'Failed to load collections');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [credentials, options?.siteId, options?.includeSchema, clientConfig.baseUrl]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleDelete = useCallback(async (fullName: string): Promise<boolean> => {
    if (!credentials) return false;
    try {
      const res = await deleteUserCollection(credentials, fullName, clientConfig);
      if (res.ok) {
        await refresh();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [credentials, clientConfig.baseUrl, refresh]);

  return {
    collections,
    groupedBySite,
    isLoading,
    error,
    refresh,
    deleteCollection: handleDelete,
  };
}
