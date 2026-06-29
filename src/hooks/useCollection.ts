/**
 * useCollection — Direct MongoDB access for built-app components.
 *
 * Provides reactive read access and direct write mutations (insert, update, remove)
 * to MongoDB collections. The agent is NOT involved in data operations.
 *
 * Collection names are auto-prefixed with app_scope by the backend —
 * just pass the short name (e.g. 'transactions', not 'site_abc__transactions').
 *
 * Usage:
 *   const { documents, isLoading, insert, update, remove } = useCollection<Transaction>('transactions', {
 *     sort: { date: -1 },
 *     limit: 50,
 *     refreshOnAgentComplete: true,
 *   });
 *
 *   // Insert a document — auto-refetches all useCollection('transactions') instances
 *   await insert({ date: '2026-04-02', amount: 42.50, category: 'Groceries' });
 *
 *   // Update a document
 *   await update({ _id: docId }, { $set: { category: 'Dining' } });
 *
 *   // Delete a document
 *   await remove({ _id: docId });
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useFlowstack } from '../context/FlowstackProvider';
import { queryCollection, insertDocuments, updateDocuments, deleteDocuments } from '../api/client';
import type { CollectionLayer } from '../types';

export interface UseCollectionOptions {
  /** MongoDB query filter (e.g. { status: 'pending' }) */
  filter?: Record<string, any>;
  /** Max documents to return (default 50, max 500) */
  limit?: number;
  /** Skip N documents for pagination */
  skip?: number;
  /** Sort spec (e.g. { date: -1 } for newest first) */
  sort?: Record<string, 1 | -1>;
  /** Field projection (e.g. { _id: 0, amount: 1 }) */
  projection?: Record<string, 0 | 1>;
  /** Auto-poll interval in ms (optional — no polling by default) */
  refreshInterval?: number;
  /** Auto-refresh when agent completes a MongoDB write (default false) */
  refreshOnAgentComplete?: boolean;
  /** Skip initial fetch (useful for conditional rendering) */
  enabled?: boolean;
  /** Data layer override: 'shared' | 'user' | 'auto' (default: backend decides via app_config) */
  layer?: CollectionLayer;
  /**
   * P0-69: include workspace provenance envelope (`_flowstack`) on every
   * document in the response. Sends `include_provenance=true` on the
   * query string. When true, each document will have a `_flowstack`
   * field with workspace attribution metadata. Default false.
   */
  includeProvenance?: boolean;
}

export interface UseCollectionReturn<T> {
  /** Array of documents from the collection */
  documents: T[];
  /** Number of documents returned (≤ limit) */
  count: number;
  /** Total documents matching the filter (for pagination) */
  total: number;
  /** Loading state */
  isLoading: boolean;
  /** Error message if query failed */
  error: string | null;
  /** Manual refresh — re-fetches with current options */
  refresh: () => Promise<void>;
  /** Insert one or more documents. Auto-refetches after success. */
  insert: (doc: Partial<T> | Partial<T>[]) => Promise<{ inserted_ids: string[] }>;
  /** Update documents matching filter. Auto-refetches after success. */
  update: (filter: Record<string, any>, update: Record<string, any>, opts?: { upsert?: boolean }) => Promise<{ modified_count: number }>;
  /** Delete documents matching filter. Auto-refetches after success. */
  remove: (filter: Record<string, any>) => Promise<{ deleted_count: number }>;
}

// Global event name for collection mutations (from useCollection or agent writes)
export const COLLECTION_CHANGED_EVENT = 'flowstack:collection-changed';

/** Dispatch a collection changed event for cross-component sync. */
function dispatchCollectionChanged(collection: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(COLLECTION_CHANGED_EVENT, { detail: { collection } }),
    );
  }
}

export function useCollection<T = Record<string, any>>(
  collection: string,
  options?: UseCollectionOptions,
): UseCollectionReturn<T> {
  const { credentials, config } = useFlowstack();

  const [documents, setDocuments] = useState<T[]>([]);
  const [count, setCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track mounted state to prevent state updates after unmount
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const enabled = options?.enabled !== false;

  const fetchData = useCallback(async () => {
    if (!credentials || !enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await queryCollection<T>(
        credentials,
        collection,
        {
          filter: options?.filter,
          limit: options?.limit,
          skip: options?.skip,
          sort: options?.sort,
          projection: options?.projection,
          layer: options?.layer,
          includeProvenance: options?.includeProvenance,
        },
        { baseUrl: config.baseUrl, tenantId: config.tenantId },
      );

      if (!mountedRef.current) return;

      if (result.ok && result.data) {
        setDocuments(result.data.documents);
        setCount(result.data.count);
        setTotal(result.data.total);
      } else {
        setError(result.error || 'Failed to fetch collection');
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
    credentials,
    config.baseUrl,
    config.tenantId,
    collection,
    enabled,
    // Serialize options for dependency comparison
    JSON.stringify(options?.filter),
    options?.limit,
    options?.skip,
    JSON.stringify(options?.sort),
    JSON.stringify(options?.projection),
    options?.layer,
  ]);

  // Initial fetch + re-fetch on option changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Optional polling
  useEffect(() => {
    if (!options?.refreshInterval || !enabled) return;
    const interval = setInterval(fetchData, options.refreshInterval);
    return () => clearInterval(interval);
  }, [fetchData, options?.refreshInterval, enabled]);

  // Auto-refresh on collection change events (from mutations or agent writes)
  useEffect(() => {
    if (!options?.refreshOnAgentComplete) return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      // Refetch if event targets this collection or is a generic event (no collection specified)
      if (!detail?.collection || detail.collection === collection) {
        fetchData();
      }
    };
    window.addEventListener(COLLECTION_CHANGED_EVENT, handler);
    return () => window.removeEventListener(COLLECTION_CHANGED_EVENT, handler);
  }, [fetchData, options?.refreshOnAgentComplete, collection]);

  // --- Mutations ---

  const insert = useCallback(async (doc: Partial<T> | Partial<T>[]): Promise<{ inserted_ids: string[] }> => {
    if (!credentials) throw new Error('Not authenticated');

    const result = await insertDocuments(
      credentials,
      collection,
      doc as Record<string, any> | Record<string, any>[],
      { baseUrl: config.baseUrl, tenantId: config.tenantId },
      options?.layer,
    );

    if (!result.ok) {
      throw new Error(result.error || 'Insert failed');
    }

    // Notify other useCollection instances and refetch
    dispatchCollectionChanged(collection);
    await fetchData();

    return { inserted_ids: result.data!.inserted_ids };
  }, [credentials, config.baseUrl, config.tenantId, collection, fetchData, options?.layer]);

  const update = useCallback(async (
    filter: Record<string, any>,
    updateSpec: Record<string, any>,
    opts?: { upsert?: boolean },
  ): Promise<{ modified_count: number }> => {
    if (!credentials) throw new Error('Not authenticated');

    const result = await updateDocuments(
      credentials,
      collection,
      filter,
      updateSpec,
      opts,
      { baseUrl: config.baseUrl, tenantId: config.tenantId },
      options?.layer,
    );

    if (!result.ok) {
      throw new Error(result.error || 'Update failed');
    }

    dispatchCollectionChanged(collection);
    await fetchData();

    return { modified_count: result.data!.modified_count };
  }, [credentials, config.baseUrl, config.tenantId, collection, fetchData, options?.layer]);

  const remove = useCallback(async (filter: Record<string, any>): Promise<{ deleted_count: number }> => {
    if (!credentials) throw new Error('Not authenticated');

    const result = await deleteDocuments(
      credentials,
      collection,
      filter,
      { baseUrl: config.baseUrl, tenantId: config.tenantId },
      options?.layer,
    );

    if (!result.ok) {
      throw new Error(result.error || 'Delete failed');
    }

    dispatchCollectionChanged(collection);
    await fetchData();

    return { deleted_count: result.data!.deleted_count };
  }, [credentials, config.baseUrl, config.tenantId, collection, fetchData, options?.layer]);

  return {
    documents,
    count,
    total,
    isLoading,
    error,
    refresh: fetchData,
    insert,
    update,
    remove,
  };
}
