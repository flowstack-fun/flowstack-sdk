'use client';

/**
 * useWorkspace Hook
 *
 * Provides workspace management functionality.
 *
 * @example
 * ```tsx
 * function WorkspaceManager() {
 *   const { workspaces, selectedWorkspace, createWorkspace, selectWorkspace } = useWorkspace();
 *
 *   return (
 *     <div>
 *       <select onChange={(e) => {
 *         const ws = workspaces.find(w => w.workspaceId === e.target.value);
 *         if (ws) selectWorkspace(ws);
 *       }}>
 *         {workspaces.map(ws => (
 *           <option key={ws.workspaceId} value={ws.workspaceId}>{ws.name}</option>
 *         ))}
 *       </select>
 *       <button onClick={() => createWorkspace('New Project')}>New Workspace</button>
 *     </div>
 *   );
 * }
 * ```
 */

import { useState, useCallback } from 'react';
import { useFlowstack } from '../context/FlowstackProvider';
import type { UseWorkspaceReturn, WorkspaceInfo } from '../types';

/**
 * Hook for workspace management
 */
export function useWorkspace(): UseWorkspaceReturn {
  const {
    workspaces,
    selectedWorkspace,
    setSelectedWorkspace,
    refreshWorkspaces: contextRefresh,
    createWorkspace: contextCreate,
    isLoadingWorkspaces,
  } = useFlowstack();

  const [error, setError] = useState<string | null>(null);

  /**
   * Create a new workspace
   */
  const createWorkspace = useCallback(async (
    name: string,
    description?: string
  ): Promise<WorkspaceInfo | null> => {
    setError(null);

    try {
      const workspace = await contextCreate(name, description);
      if (!workspace) {
        setError('Failed to create workspace');
      }
      return workspace;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create workspace';
      setError(message);
      return null;
    }
  }, [contextCreate]);

  /**
   * Select a workspace
   */
  const selectWorkspace = useCallback((workspace: WorkspaceInfo) => {
    setError(null);
    setSelectedWorkspace(workspace);
  }, [setSelectedWorkspace]);

  /**
   * Refresh workspaces list
   */
  const refreshWorkspaces = useCallback(async () => {
    setError(null);
    try {
      await contextRefresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to refresh workspaces';
      setError(message);
    }
  }, [contextRefresh]);

  return {
    workspaces,
    selectedWorkspace,
    isLoading: isLoadingWorkspaces,
    error,
    createWorkspace,
    selectWorkspace,
    refreshWorkspaces,
  };
}
