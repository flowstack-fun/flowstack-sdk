'use client';

/**
 * useVisualizations Hook
 *
 * Provides access to workspace visualizations.
 *
 * @example
 * ```tsx
 * function VizGallery() {
 *   const { visualizations, isLoading } = useVisualizations();
 *
 *   return (
 *     <div className="grid">
 *       {visualizations.map(viz => (
 *         <img key={viz.name} src={viz.imageUrl} alt={viz.name} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */

import { useState, useCallback } from 'react';
import { useFlowstack } from '../context/FlowstackProvider';
import type { UseVisualizationsReturn } from '../types';

/**
 * Hook for visualization operations
 */
export function useVisualizations(): UseVisualizationsReturn {
  const {
    visualizations,
    refreshVisualizations: contextRefresh,
    isLoadingVisualizations,
  } = useFlowstack();

  const [error, setError] = useState<string | null>(null);

  /**
   * Refresh visualizations list
   */
  const refreshVisualizations = useCallback(async () => {
    setError(null);
    try {
      await contextRefresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Refresh failed';
      setError(message);
    }
  }, [contextRefresh]);

  return {
    visualizations,
    isLoading: isLoadingVisualizations,
    error,
    refreshVisualizations,
  };
}
