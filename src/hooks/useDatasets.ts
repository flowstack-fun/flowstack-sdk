'use client';

/**
 * useDatasets Hook
 *
 * Provides dataset management functionality including upload, download, and deletion.
 *
 * @example
 * ```tsx
 * function DatasetManager() {
 *   const { datasets, uploadDataset, deleteDataset, isLoading } = useDatasets();
 *
 *   const handleUpload = async (file: File) => {
 *     const dataset = await uploadDataset(file);
 *     if (dataset) console.log('Uploaded:', dataset.name);
 *   };
 *
 *   return (
 *     <div>
 *       <input type="file" onChange={(e) => handleUpload(e.target.files[0])} />
 *       <ul>
 *         {datasets.map(ds => (
 *           <li key={ds.id}>
 *             {ds.name} ({ds.rows} rows)
 *             <button onClick={() => deleteDataset(ds.name)}>Delete</button>
 *           </li>
 *         ))}
 *       </ul>
 *     </div>
 *   );
 * }
 * ```
 */

import { useState, useCallback } from 'react';
import { useFlowstack } from '../context/FlowstackProvider';
import type { UseDatasetsReturn, DatasetInfo } from '../types';
import { uploadFile, deleteDataset as apiDeleteDataset, flowstackFetch } from '../api/client';
import { mockDelay, generateMockId } from '../mock/fixtures';

/**
 * Hook for dataset operations
 */
export function useDatasets(): UseDatasetsReturn {
  const {
    credentials,
    selectedWorkspace,
    datasets,
    refreshDatasets: contextRefresh,
    isLoadingDatasets,
    config,
  } = useFlowstack();

  const [error, setError] = useState<string | null>(null);

  const clientConfig = {
    baseUrl: config.baseUrl,
    tenantId: config.tenantId,
  };

  const isMockMode = config.mode === 'mock';

  /**
   * Upload a dataset file
   */
  const uploadDataset = useCallback(async (
    file: File,
    name?: string
  ): Promise<DatasetInfo | null> => {
    setError(null);

    if (!credentials && !isMockMode) {
      setError('Not authenticated');
      return null;
    }

    if (!selectedWorkspace && !isMockMode) {
      setError('No workspace selected');
      return null;
    }

    try {
      // Mock mode - create mock dataset
      if (isMockMode) {
        await mockDelay(500, 1500);
        const mockDataset: DatasetInfo = {
          id: generateMockId('ds'),
          name: name || file.name.replace(/\.[^/.]+$/, ''),
          rows: Math.floor(Math.random() * 10000) + 100,
          columns: Math.floor(Math.random() * 20) + 3,
          columnNames: ['col1', 'col2', 'col3'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await contextRefresh();
        return mockDataset;
      }

      const response = await uploadFile(
        credentials!,
        selectedWorkspace!.workspaceId,
        file,
        name,
        clientConfig
      );

      if (response.ok && response.data?.dataset) {
        // Refresh datasets list
        await contextRefresh();
        return response.data.dataset;
      }

      setError(response.error || 'Upload failed');
      return null;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setError(message);
      return null;
    }
  }, [credentials, selectedWorkspace, clientConfig, contextRefresh, isMockMode]);

  /**
   * Download a dataset
   */
  const downloadDataset = useCallback(async (name: string): Promise<Blob | null> => {
    setError(null);

    if (!credentials && !isMockMode) {
      setError('Not authenticated');
      return null;
    }

    if (!selectedWorkspace && !isMockMode) {
      setError('No workspace selected');
      return null;
    }

    try {
      // Mock mode - return mock CSV blob
      if (isMockMode) {
        await mockDelay(200, 500);
        const mockCsv = 'id,name,value\n1,Item A,100\n2,Item B,200\n3,Item C,300';
        return new Blob([mockCsv], { type: 'text/csv' });
      }

      const baseUrl = config.baseUrl || 'https://sage-api.flowstack.fun';
      const tenantId = credentials!.tenantId || config.tenantId || '';

      // API uses /datasets/{name}/download (not workspace-scoped)
      const url = `${baseUrl}/datasets/${name}/download`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${credentials!.apiKey}`,
          'X-Tenant-ID': tenantId,
          'X-User-ID': credentials!.userId || '',
        },
      });

      if (!response.ok) {
        setError(`Download failed: ${response.statusText}`);
        return null;
      }

      return await response.blob();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Download failed';
      setError(message);
      return null;
    }
  }, [credentials, selectedWorkspace, config, isMockMode]);

  /**
   * Delete a dataset
   */
  const deleteDataset = useCallback(async (name: string): Promise<boolean> => {
    setError(null);

    if (!credentials && !isMockMode) {
      setError('Not authenticated');
      return false;
    }

    if (!selectedWorkspace && !isMockMode) {
      setError('No workspace selected');
      return false;
    }

    try {
      // Mock mode - just refresh to simulate delete
      if (isMockMode) {
        await mockDelay(200, 500);
        await contextRefresh();
        return true;
      }

      const response = await apiDeleteDataset(
        credentials!,
        name,
        clientConfig
      );

      if (response.ok) {
        // Refresh datasets list
        await contextRefresh();
        return true;
      }

      setError(response.error || 'Delete failed');
      return false;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delete failed';
      setError(message);
      return false;
    }
  }, [credentials, selectedWorkspace, clientConfig, contextRefresh, isMockMode]);

  /**
   * Refresh datasets list
   */
  const refreshDatasets = useCallback(async () => {
    setError(null);
    try {
      await contextRefresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Refresh failed';
      setError(message);
    }
  }, [contextRefresh]);

  return {
    datasets,
    isLoading: isLoadingDatasets,
    error,
    uploadDataset,
    downloadDataset,
    deleteDataset,
    refreshDatasets,
  };
}
