/**
 * useCollectionExplorer — Browse, query, export, and delete a specific MongoDB collection.
 *
 * Provides paginated document browsing, schema inference, CSV/JSON export,
 * and collection deletion for the Casino data explorer.
 */

import { useState, useEffect, useCallback } from 'react';
import { useFlowstack } from '../context/FlowstackProvider';
import {
  getUserCollectionDocuments,
  getUserCollectionSchema,
  deleteUserCollection,
  exportUserCollection,
} from '../api/client';
import type { CollectionSchemaInfo } from '../types';

export interface UseCollectionExplorerOptions {
  filter?: Record<string, any>;
  limit?: number;
  skip?: number;
  sort?: Record<string, 1 | -1>;
  database?: string;
}

export interface UseCollectionExplorerReturn<T> {
  documents: T[];
  total: number;
  schema: CollectionSchemaInfo | null;
  isLoading: boolean;
  error: string | null;
  page: number;
  pageSize: number;
  setPage: (page: number) => void;
  refresh: () => Promise<void>;
  exportAs: (format: 'json' | 'csv') => Promise<void>;
  deleteCollection: () => Promise<boolean>;
}

export function useCollectionExplorer<T = Record<string, any>>(
  collection: string,
  options?: UseCollectionExplorerOptions,
): UseCollectionExplorerReturn<T> {
  const { credentials, config } = useFlowstack();
  const [documents, setDocuments] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [schema, setSchema] = useState<CollectionSchemaInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = options?.limit || 50;

  const clientConfig = { baseUrl: config.baseUrl, tenantId: config.tenantId };

  const fetchDocuments = useCallback(async () => {
    if (!credentials || !collection) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await getUserCollectionDocuments<T>(
        credentials,
        collection,
        {
          filter: options?.filter,
          limit: pageSize,
          skip: page * pageSize,
          sort: options?.sort,
          database: options?.database,
        },
        clientConfig,
      );
      if (res.ok && res.data) {
        setDocuments(res.data.documents || []);
        setTotal(res.data.total || 0);
      } else {
        setError(res.error || 'Failed to load documents');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [credentials, collection, page, pageSize, options?.filter, options?.sort, options?.database, clientConfig.baseUrl]);

  const fetchSchema = useCallback(async () => {
    if (!credentials || !collection) return;
    try {
      const res = await getUserCollectionSchema(
        credentials, collection,
        { database: options?.database },
        clientConfig,
      );
      if (res.ok && res.data) {
        setSchema(res.data);
      }
    } catch {
      // Schema is non-critical
    }
  }, [credentials, collection, options?.database, clientConfig.baseUrl]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    fetchSchema();
  }, [fetchSchema]);

  const refresh = useCallback(async () => {
    await Promise.all([fetchDocuments(), fetchSchema()]);
  }, [fetchDocuments, fetchSchema]);

  const exportAs = useCallback(async (format: 'json' | 'csv') => {
    if (!credentials) return;
    try {
      const res = await exportUserCollection(
        credentials, collection,
        { format, filter: options?.filter, database: options?.database },
        clientConfig,
      );
      if (res.ok && res.data) {
        // Trigger browser download
        const blob = res.data instanceof Blob ? res.data : new Blob([JSON.stringify(res.data)]);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${collection}.${format}`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err: any) {
      setError(`Export failed: ${err.message}`);
    }
  }, [credentials, collection, options?.filter, options?.database, clientConfig.baseUrl]);

  const handleDelete = useCallback(async (): Promise<boolean> => {
    if (!credentials) return false;
    try {
      const res = await deleteUserCollection(credentials, collection, clientConfig);
      return res.ok === true;
    } catch {
      return false;
    }
  }, [credentials, collection, clientConfig.baseUrl]);

  return {
    documents,
    total,
    schema,
    isLoading,
    error,
    page,
    pageSize,
    setPage,
    refresh,
    exportAs,
    deleteCollection: handleDelete,
  };
}
