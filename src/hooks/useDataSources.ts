'use client';

/**
 * useDataSources Hook
 *
 * Provides data source management for connecting to external databases.
 *
 * @example
 * ```tsx
 * function ConnectDB() {
 *   const { dataSources, createDataSource, testConnection, isLoading } = useDataSources();
 *
 *   const connect = async () => {
 *     const source = await createDataSource({
 *       type: 'mongodb',
 *       name: 'Production DB',
 *       connectionString: 'mongodb://...'
 *     });
 *
 *     if (source) {
 *       const result = await testConnection(source.source_id);
 *       console.log(result.success ? 'Connected!' : result.message);
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       <button onClick={connect}>Connect MongoDB</button>
 *       <ul>
 *         {dataSources.map(ds => (
 *           <li key={ds.source_id}>{ds.name} ({ds.source_type})</li>
 *         ))}
 *       </ul>
 *     </div>
 *   );
 * }
 * ```
 */

import { useState, useCallback, useEffect } from 'react';
import { useFlowstack } from '../context/FlowstackProvider';
import type { UseDataSourcesReturn, DataSource, DataSourceConfig, ConnectionTestResult } from '../types';
import {
  listDataSources,
  createDataSource as apiCreateDataSource,
  testDataSource,
  deleteDataSource as apiDeleteDataSource,
} from '../api/client';

/**
 * Hook options for {@link useDataSources}.
 */
export interface UseDataSourcesOptions {
  /**
   * P0-69: when true, appends `include_provenance=true` to the list
   * request so each data source comes back with a `_flowstack`
   * workspace attribution envelope. Useful for built apps that need to
   * know which workspace a shared data source belongs to.
   */
  includeProvenance?: boolean;
}

/**
 * Hook for data source management
 */
export function useDataSources(options?: UseDataSourcesOptions): UseDataSourcesReturn {
  const {
    credentials,
    config,
  } = useFlowstack();

  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientConfig = {
    baseUrl: config.baseUrl,
    tenantId: config.tenantId,
  };
  const includeProvenance = options?.includeProvenance;

  /**
   * Refresh data sources list
   */
  const refreshDataSources = useCallback(async () => {
    if (!credentials) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await listDataSources(credentials, clientConfig, { includeProvenance });

      if (response.ok && response.data) {
        setDataSources(response.data.datasources || []);
      } else {
        setError(response.error || 'Failed to load data sources');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load data sources';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [credentials, clientConfig, includeProvenance]);

  // Load data sources on mount
  useEffect(() => {
    if (credentials) {
      refreshDataSources();
    }
  }, [credentials]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Create a new data source
   */
  const createDataSource = useCallback(async (
    sourceConfig: DataSourceConfig
  ): Promise<DataSource | null> => {
    setError(null);

    if (!credentials) {
      setError('Not authenticated');
      return null;
    }

    try {
      const response = await apiCreateDataSource(credentials, sourceConfig, clientConfig);

      if (response.ok && response.data) {
        // Refresh list
        await refreshDataSources();
        return response.data;
      }

      setError(response.error || 'Failed to create data source');
      return null;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create data source';
      setError(message);
      return null;
    }
  }, [credentials, clientConfig, refreshDataSources]);

  /**
   * Test a data source connection
   */
  const testConnection = useCallback(async (id: string): Promise<ConnectionTestResult> => {
    setError(null);

    if (!credentials) {
      return { success: false, message: 'Not authenticated' };
    }

    try {
      const response = await testDataSource(credentials, id, clientConfig);

      if (response.ok && response.data) {
        return response.data;
      }

      return { success: false, message: response.error || 'Connection test failed' };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection test failed';
      return { success: false, message };
    }
  }, [credentials, clientConfig]);

  /**
   * Delete a data source
   */
  const deleteDataSource = useCallback(async (id: string): Promise<boolean> => {
    setError(null);

    if (!credentials) {
      setError('Not authenticated');
      return false;
    }

    try {
      const response = await apiDeleteDataSource(credentials, id, clientConfig);

      if (response.ok) {
        // Refresh list
        await refreshDataSources();
        return true;
      }

      setError(response.error || 'Failed to delete data source');
      return false;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete data source';
      setError(message);
      return false;
    }
  }, [credentials, clientConfig, refreshDataSources]);

  return {
    dataSources,
    isLoading,
    error,
    createDataSource,
    testConnection,
    deleteDataSource,
    refreshDataSources,
  };
}
