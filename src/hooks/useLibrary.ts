'use client';

/**
 * useLibrary — paginated library items for a given type.
 *
 * Calls GET /library/{type} with cursor-based pagination.
 * Returns the shape LibraryList.tsx expects:
 *   { items, isLoading, error, hasMore, total, loadMore, refresh, deleteItem }
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useFlowstackOptional } from '../context/FlowstackProvider';
import type { FlowstackClientConfig } from '../api/client';

export type LibraryItemType = string;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface UseLibraryReturn {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items: any[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  total: number | null;
  loadMore: () => void;
  refresh: (search?: string) => void;
  deleteItem: (name: string) => Promise<boolean>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getDetail: (name: string) => Promise<Record<string, any> | null>;
}

// Maps SDK type names to backend path segments
const TYPE_PATH: Record<string, string> = {
  dataset: 'datasets',
  visualization: 'visualizations',
  code: 'code',
  document: 'documents',
  report: 'reports',
  model: 'models',
};

async function _authedFetch(
  method: string,
  url: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  credentials: any,
): Promise<Response> {
  return fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${credentials.apiKey}`,
      'X-Tenant-ID': credentials.tenantId,
      'X-User-ID': credentials.userId,
    },
  });
}

export function useLibrary(type: LibraryItemType): UseLibraryReturn {
  const ctx = useFlowstackOptional();
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState<number | null>(null);

  const creds = useMemo(() => ({
    apiKey: (ctx?.credentials as any)?.apiKey || '',
    tenantId: (ctx?.credentials as any)?.tenantId || ctx?.config?.tenantId || '',
    userId: (ctx?.credentials as any)?.userId || '',
  }), [ctx?.credentials, ctx?.config?.tenantId]);

  const baseUrl = ctx?.config?.baseUrl || 'https://sage-api.flowstack.fun';
  const pathSeg = TYPE_PATH[type];

  const fetchItems = useCallback(async (opts?: { cursor?: string | null; search?: string; replace?: boolean }) => {
    if (!creds.apiKey || !pathSeg) return;
    setIsLoading(true);
    if (opts?.replace !== false) setError(null);
    try {
      const url = new URL(`${baseUrl}/library/${pathSeg}`);
      url.searchParams.set('user_id', creds.userId);
      url.searchParams.set('limit', '50');
      if (opts?.cursor) url.searchParams.set('cursor', opts.cursor);
      if (opts?.search) url.searchParams.set('search', opts.search);

      const resp = await _authedFetch('GET', url.toString(), creds);
      if (!resp.ok) {
        setError(`Failed to load ${type} (${resp.status})`);
        return;
      }
      const data = await resp.json();
      const newItems: Record<string, unknown>[] = data.items ?? [];
      if (opts?.cursor) {
        setItems(prev => [...prev, ...newItems]);
      } else {
        setItems(newItems);
      }
      setHasMore(data.has_more ?? false);
      setCursor(data.next_cursor ?? null);
      if (data.total != null) setTotal(data.total);
    } catch (e: any) {
      setError(e.message || `Failed to load ${type}`);
    } finally {
      setIsLoading(false);
    }
  }, [creds.apiKey, creds.tenantId, creds.userId, baseUrl, pathSeg, type]);

  useEffect(() => {
    setItems([]);
    setCursor(null);
    setHasMore(false);
    setTotal(null);
    fetchItems({ replace: true });
  }, [fetchItems]);

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore && cursor) {
      fetchItems({ cursor, replace: false });
    }
  }, [fetchItems, isLoading, hasMore, cursor]);

  const refresh = useCallback((search?: string) => {
    setItems([]);
    setCursor(null);
    fetchItems({ search, replace: true });
  }, [fetchItems]);

  const deleteItem = useCallback(async (name: string): Promise<boolean> => {
    if (!creds.apiKey) return false;
    try {
      const url = new URL(`${baseUrl}/library/${pathSeg}/${encodeURIComponent(name)}`);
      url.searchParams.set('user_id', creds.userId);
      const resp = await _authedFetch('DELETE', url.toString(), creds);
      if (resp.ok) refresh();
      return resp.ok;
    } catch {
      return false;
    }
  }, [creds.apiKey, creds.tenantId, creds.userId, baseUrl, pathSeg, refresh]);

  const getDetail = useCallback(async (name: string): Promise<Record<string, unknown> | null> => {
    if (!creds.apiKey || !pathSeg) return null;
    try {
      const url = new URL(`${baseUrl}/library/${pathSeg}/${encodeURIComponent(name)}`);
      url.searchParams.set('user_id', creds.userId);
      const resp = await _authedFetch('GET', url.toString(), creds);
      if (!resp.ok) return null;
      return await resp.json();
    } catch {
      return null;
    }
  }, [creds.apiKey, creds.tenantId, creds.userId, baseUrl, pathSeg]);

  return { items, isLoading, error, hasMore, total, loadMore, refresh, deleteItem, getDetail };
}
