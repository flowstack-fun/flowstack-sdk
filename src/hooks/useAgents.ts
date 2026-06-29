'use client';

/**
 * useAgents Hook
 *
 * Fetches the catalog of available agents from the backend.
 * Use this to discover which agents can be targeted directly via useAgent's targetAgent option.
 *
 * @example
 * ```tsx
 * function AgentPicker() {
 *   const { agents, isLoading } = useAgents();
 *
 *   return (
 *     <select>
 *       {agents.map(agent => (
 *         <option key={agent.name} value={agent.name}>
 *           {agent.description}
 *         </option>
 *       ))}
 *     </select>
 *   );
 * }
 * ```
 */

import { useState, useEffect, useCallback } from 'react';
import { useFlowstackOptional } from '../context/FlowstackProvider';
import { listAgents as apiListAgents } from '../api/client';
import type { AgentInfo, UseAgentsReturn } from '../types';

export function useAgents(): UseAgentsReturn {
  const flowstack = useFlowstackOptional();

  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientConfig = {
    baseUrl: flowstack?.config?.baseUrl,
    tenantId: flowstack?.config?.tenantId,
  };

  const refreshAgents = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await apiListAgents(clientConfig);
      if (result.ok && result.data) {
        // Normalize snake_case from backend to camelCase
        const normalized = result.data.agents.map((a: any) => ({
          name: a.name,
          description: a.description || '',
          tools: a.tools || [],
          triggerPhrases: a.trigger_phrases || a.triggerPhrases || [],
          useFor: a.use_for || a.useFor || [],
          isTerminal: a.is_terminal ?? a.isTerminal ?? false,
        }));
        setAgents(normalized);
      } else {
        setError(result.error || 'Failed to fetch agents');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch agents');
    } finally {
      setIsLoading(false);
    }
  }, [flowstack?.config?.baseUrl]);

  useEffect(() => {
    refreshAgents();
  }, [refreshAgents]);

  return { agents, isLoading, error, refreshAgents };
}
