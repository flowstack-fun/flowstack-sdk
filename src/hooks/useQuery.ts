'use client';

/**
 * useQuery Hook
 *
 * A lower-level hook for executing queries without managing chat history.
 * Use this when you need direct control over query execution.
 *
 * @example
 * ```tsx
 * function AnalysisRunner() {
 *   const { execute, isStreaming, result, toolCalls, visualizations } = useQuery();
 *
 *   const analyze = async () => {
 *     await execute('analyze sales data and create a chart');
 *   };
 *
 *   return (
 *     <div>
 *       <button onClick={analyze} disabled={isStreaming}>Run Analysis</button>
 *       {result && <div>{result}</div>}
 *       {visualizations.map(v => <img key={v.name} src={v.imageUrl} />)}
 *     </div>
 *   );
 * }
 * ```
 */

import { useState, useCallback, useRef } from 'react';
import { useFlowstack } from '../context/FlowstackProvider';
import type { UseQueryReturn, ToolCall, VisualizationData, QueryOptions } from '../types';
import { executeQueryWithConfig } from '../api/client';
import { parseSSEStream } from '../utils/sse-parser';

/**
 * Generate unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Hook for direct query execution
 */
export function useQuery(): UseQueryReturn {
  const {
    credentials,
    selectedWorkspace,
    addVisualization,
    config,
  } = useFlowstack();

  const [isStreaming, setIsStreaming] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [visualizations, setVisualizations] = useState<VisualizationData[]>([]);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const clientConfig = {
    baseUrl: config.baseUrl,
    tenantId: config.tenantId,
  };

  /**
   * Execute a query
   */
  const execute = useCallback(async (
    prompt: string,
    options?: QueryOptions
  ): Promise<void> => {
    setError(null);
    setResult(null);
    setToolCalls([]);
    setVisualizations([]);

    if (!credentials) {
      setError('Not authenticated');
      return;
    }

    const workspaceId = options?.workspaceId || selectedWorkspace?.workspaceId;
    if (!workspaceId) {
      setError('No workspace selected');
      return;
    }

    setIsStreaming(true);
    abortControllerRef.current = new AbortController();

    try {
      const response = await executeQueryWithConfig(
        credentials,
        prompt,
        workspaceId,
        { networkMode: options?.networkMode || 'SANDBOX', tools: options?.tools },
        clientConfig
      );

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      let fullContent = '';
      const currentToolCalls: ToolCall[] = [];
      const currentVisualizations: VisualizationData[] = [];

      // Process SSE stream
      for await (const event of parseSSEStream(reader)) {
        // Check if cancelled
        if (abortControllerRef.current?.signal.aborted) {
          break;
        }

        switch (event.type) {
          case 'text':
          case 'content':
          case 'delta':
            if (event.content) {
              fullContent += event.content;
              setResult(fullContent);
            }
            break;

          case 'tool_call':
          case 'tool_use':
            if (event.tool) {
              const toolCall: ToolCall = {
                id: generateId(),
                toolUseId: event.args?.tool_use_id as string,
                name: event.tool,
                args: event.args,
                status: 'running',
                startTime: Date.now(),
              };
              currentToolCalls.push(toolCall);
              setToolCalls([...currentToolCalls]);
            }
            break;

          case 'tool_result':
            if (event.tool || currentToolCalls.length > 0) {
              const toolIndex = currentToolCalls.findIndex(
                tc => tc.name === event.tool || tc.status === 'running'
              );
              if (toolIndex >= 0) {
                currentToolCalls[toolIndex] = {
                  ...currentToolCalls[toolIndex],
                  result: event.result,
                  status: 'complete',
                  endTime: Date.now(),
                };
                setToolCalls([...currentToolCalls]);
              }
            }
            break;

          case 'visualization':
            if (event.data) {
              const viz = event.data as VisualizationData;
              currentVisualizations.push(viz);
              setVisualizations([...currentVisualizations]);
              addVisualization(viz);
            }
            break;

          case 'error':
            setError(event.error || 'Query failed');
            break;
        }
      }

      setResult(fullContent);

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Query failed';
      setError(message);
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [credentials, selectedWorkspace, addVisualization, config, clientConfig]);

  /**
   * Cancel the current query
   */
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsStreaming(false);
  }, []);

  return {
    execute,
    isStreaming,
    result,
    toolCalls,
    visualizations,
    error,
    cancel,
  };
}
