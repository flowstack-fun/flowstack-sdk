/**
 * usePublicCollection — anonymous public submissions for built apps.
 *
 * Provides read and insert access to a public collection that requires
 * NO user authentication. Any visitor can read and write documents.
 * The collection must be declared in the app's publicCollections config.
 *
 * Designed for: leaderboards, guestbooks, comment threads, voting, polls.
 *
 * Usage:
 *   const { documents, isLoading, insert } = usePublicCollection<HighScore>('high_scores', {
 *     sort: { score: -1 },
 *     limit: 25,
 *     filter: { album: 'yeezus' },
 *   });
 *
 *   await insert({ album: 'yeezus', name: 'KEON', score: 12500 });
 *
 * No credentials required — the hook reads appScope from FlowstackProvider config.
 * Rate limiting and spam protection are enforced server-side.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useFlowstackOptional } from '../context/FlowstackProvider';

const MISSING_TENANT =
  'usePublicCollection requires a tenantId. Set `tenantId` on FlowstackProvider — ' +
  'anonymous public collections have no token for the backend to derive it from.';

export interface UsePublicCollectionOptions {
  /** MongoDB query filter (e.g. { album: 'yeezus' }) */
  filter?: Record<string, any>;
  /** Max documents to return (default 25, max 200) */
  limit?: number;
  /** Skip N documents for pagination */
  skip?: number;
  /** Sort spec (e.g. { score: -1 } for highest first) */
  sort?: Record<string, 1 | -1>;
  /** Auto-refresh interval in ms (optional) */
  refreshInterval?: number;
  /** Skip initial fetch (useful for conditional rendering) */
  enabled?: boolean;
}

export interface UsePublicCollectionReturn<T> {
  /** Array of documents (submitter_ip_hash stripped server-side) */
  documents: T[];
  /** Count of documents returned (≤ limit) */
  count: number;
  /** Total documents in collection matching the filter */
  total: number;
  /** Loading state */
  isLoading: boolean;
  /** Error message if query failed */
  error: string | null;
  /** Insert a single document — no auth required */
  insert: (doc: Partial<T>) => Promise<{ inserted_id: string }>;
  /** Manual refresh */
  refresh: () => Promise<void>;
}

export function usePublicCollection<T = Record<string, any>>(
  collection: string,
  options?: UsePublicCollectionOptions,
): UsePublicCollectionReturn<T> {
  const flowstack = useFlowstackOptional();

  const [documents, setDocuments] = useState<T[]>([]);
  const [count, setCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const baseUrl = flowstack?.config?.baseUrl ?? 'https://sage-api.flowstack.fun';
  const appScope = flowstack?.config?.appScope ?? '';
  // Tenant is required for anonymous access (no token for the backend to derive it
  // from). Prefer a logged-in user's JWT tenant, then an explicitly configured
  // tenantId. There is no platform default — an unset tenant is a hard error below.
  const tenantId = flowstack?.credentials?.tenantId || flowstack?.config?.tenantId || '';
  const enabled = options?.enabled !== false;

  const fetchData = useCallback(async () => {
    if (!appScope || !enabled) return;
    if (!tenantId) {
      setError(MISSING_TENANT);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (options?.limit !== undefined) params.set('limit', String(options.limit));
      if (options?.skip !== undefined) params.set('skip', String(options.skip));
      if (options?.sort) {
        const [field, dir] = Object.entries(options.sort)[0] ?? [];
        if (field) {
          params.set('sort_field', field);
          params.set('sort_dir', String(dir ?? -1));
        }
      }
      if (options?.filter) {
        params.set('filter_json', JSON.stringify(options.filter));
      }

      const url = `${baseUrl}/public/collections/${encodeURIComponent(collection)}/documents?${params.toString()}`;
      const resp = await fetch(url, {
        headers: {
          'X-App-Scope': appScope,
          'X-Tenant-ID': tenantId,
        },
      });

      if (!mountedRef.current) return;

      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        setError(body.detail || `Query failed: ${resp.status}`);
        return;
      }

      const data = await resp.json();
      if (mountedRef.current) {
        setDocuments(data.documents ?? []);
        setCount(data.count ?? 0);
        setTotal(data.total ?? 0);
      }
    } catch (err: any) {
      if (mountedRef.current) {
        setError(err.message || 'Network error');
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [
    baseUrl,
    appScope,
    tenantId,
    collection,
    enabled,
    JSON.stringify(options?.filter),
    options?.limit,
    options?.skip,
    JSON.stringify(options?.sort),
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!options?.refreshInterval || !enabled) return;
    const interval = setInterval(fetchData, options.refreshInterval);
    return () => clearInterval(interval);
  }, [fetchData, options?.refreshInterval, enabled]);

  const insert = useCallback(async (doc: Partial<T>): Promise<{ inserted_id: string }> => {
    if (!appScope) throw new Error('No appScope — FlowstackProvider must be mounted with a valid appScope');
    if (!tenantId) throw new Error(MISSING_TENANT);

    const url = `${baseUrl}/public/collections/${encodeURIComponent(collection)}/insert`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-App-Scope': appScope,
        'X-Tenant-ID': tenantId,
      },
      body: JSON.stringify({ document: doc }),
    });

    if (!resp.ok) {
      const body = await resp.json().catch(() => ({}));
      throw new Error(body.detail || `Insert failed: ${resp.status}`);
    }

    const data = await resp.json();
    // Refresh the list after a successful insert
    fetchData();
    return { inserted_id: data.inserted_id };
  }, [baseUrl, appScope, tenantId, collection, fetchData]);

  return { documents, count, total, isLoading, error, insert, refresh: fetchData };
}
