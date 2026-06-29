'use client';

/**
 * useModels Hook
 *
 * Provides ML model management functionality.
 *
 * @example
 * ```tsx
 * function ModelsList() {
 *   const { models, downloadModel, isLoading } = useModels();
 *
 *   const handleDownload = async (name: string) => {
 *     const blob = await downloadModel(name);
 *     if (blob) {
 *       const url = URL.createObjectURL(blob);
 *       const a = document.createElement('a');
 *       a.href = url;
 *       a.download = name;
 *       a.click();
 *     }
 *   };
 *
 *   return (
 *     <ul>
 *       {models.map(m => (
 *         <li key={m.id}>
 *           {m.name} ({m.format})
 *           <button onClick={() => handleDownload(m.name)}>Download</button>
 *         </li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */

import { useState, useCallback } from 'react';
import { useFlowstack } from '../context/FlowstackProvider';
import type { UseModelsReturn } from '../types';

/**
 * Hook for ML model operations
 */
export function useModels(): UseModelsReturn {
  const {
    credentials,
    selectedWorkspace,
    models,
    refreshModels: contextRefresh,
    isLoadingModels,
    config,
  } = useFlowstack();

  const [error, setError] = useState<string | null>(null);

  /**
   * Download a model
   */
  const downloadModel = useCallback(async (name: string): Promise<Blob | null> => {
    setError(null);

    if (!credentials) {
      setError('Not authenticated');
      return null;
    }

    if (!selectedWorkspace) {
      setError('No workspace selected');
      return null;
    }

    try {
      // Find model to get download URL
      const model = models.find(m => m.name === name);
      if (!model?.download_url) {
        setError('Model download URL not available');
        return null;
      }

      const response = await fetch(model.download_url, {
        headers: {
          'Authorization': `Bearer ${credentials.apiKey}`,
          'X-Tenant-ID': credentials.tenantId,
          'X-User-ID': credentials.userId || '',
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
  }, [credentials, selectedWorkspace, models]);

  /**
   * Refresh models list
   */
  const refreshModels = useCallback(async () => {
    setError(null);
    try {
      await contextRefresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Refresh failed';
      setError(message);
    }
  }, [contextRefresh]);

  return {
    models,
    isLoading: isLoadingModels,
    error,
    downloadModel,
    refreshModels,
  };
}
