'use client';

/**
 * useIntentAgent Hook
 *
 * Creates and manages agents dynamically based on user intent.
 * Uses the AgentFactory to analyze intent and generate appropriate configurations.
 *
 * @example
 * ```tsx
 * function SmartChat() {
 *   const {
 *     createAgent,
 *     query,
 *     agent,
 *     messages,
 *     isStreaming,
 *     isCreating
 *   } = useIntentAgent();
 *
 *   useEffect(() => {
 *     createAgent("Help me analyze sales data and find trends");
 *   }, []);
 *
 *   if (isCreating) {
 *     return <p>Setting up your AI assistant...</p>;
 *   }
 *
 *   return (
 *     <div>
 *       {agent && (
 *         <div>
 *           <span>{agent.name}</span>
 *           <span>Confidence: {Math.round(agent.analysis.confidence * 100)}%</span>
 *         </div>
 *       )}
 *       <ChatInterface
 *         messages={messages}
 *         isStreaming={isStreaming}
 *         onSend={query}
 *       />
 *     </div>
 *   );
 * }
 * ```
 */

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useFlowstack } from '../context/FlowstackProvider';
import { AgentFactory } from '../factory/agent-factory';
import { executeQueryWithConfig } from '../api/client';
import { parseSSEStream } from '../utils/sse-parser';
import type {
  UseIntentAgentReturn,
  UseIntentAgentOptions,
  RegisteredAgent,
} from '../factory/types';
import type { ChatMessage, ToolCall, VisualizationData } from '../types';

/**
 * Generate unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Hook for intent-based AI agent interactions
 *
 * @param options - Factory configuration options
 */
export function useIntentAgent(
  options: UseIntentAgentOptions = {}
): UseIntentAgentReturn {
  const {
    credentials,
    selectedWorkspace,
    messages,
    addMessage,
    updateMessage,
    clearMessages: contextClear,
    setIsQueryRunning,
    setQueryStartTime,
    addVisualization,
    refreshDatasets,
    refreshVisualizations,
    config,
  } = useFlowstack();

  // Factory instance (memoized based on options)
  const factory = useMemo(
    () => new AgentFactory({
      useLLMFallback: options.useLLMFallback,
      ruleConfidenceThreshold: options.ruleConfidenceThreshold,
      enableCache: options.enableCache,
      cacheTTL: options.cacheTTL,
      customPatterns: options.customPatterns,
    }),
    [
      options.useLLMFallback,
      options.ruleConfidenceThreshold,
      options.enableCache,
      options.cacheTTL,
      options.customPatterns,
    ]
  );

  // State
  const [agent, setAgent] = useState<RegisteredAgent | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const currentMessageIdRef = useRef<string | null>(null);

  const clientConfig = useMemo(() => ({
    baseUrl: config.baseUrl,
    tenantId: config.tenantId,
  }), [config.baseUrl, config.tenantId]);

  // Handle initial intent if provided
  useEffect(() => {
    if (options.initialIntent && !agent && !isCreating) {
      createAgent(options.initialIntent);
    }
  }, [options.initialIntent]);

  /**
   * Create an LLM executor for fallback intent analysis
   */
  const createLLMExecutor = useCallback(() => {
    if (!credentials || !selectedWorkspace) {
      return undefined;
    }

    return async (prompt: string): Promise<string> => {
      const response = await executeQueryWithConfig(
        credentials,
        prompt,
        selectedWorkspace.workspaceId,
        { networkMode: 'SANDBOX' },
        clientConfig
      );

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      let result = '';

      for await (const event of parseSSEStream(reader)) {
        if (event.type === 'text' || event.type === 'content' || event.type === 'delta') {
          result += event.content || '';
        }
      }

      return result;
    };
  }, [credentials, selectedWorkspace, clientConfig]);

  /**
   * Create agent from intent
   */
  const createAgent = useCallback(async (intent: string): Promise<RegisteredAgent> => {
    setError(null);
    setIsCreating(true);

    try {
      const llmExecutor = createLLMExecutor();
      const newAgent = await factory.createFromIntent(intent, llmExecutor);
      setAgent(newAgent);
      return newAgent;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create agent';
      setError(message);
      throw err;
    } finally {
      setIsCreating(false);
    }
  }, [factory, createLLMExecutor]);

  /**
   * Execute query with current agent
   */
  const query = useCallback(async (prompt: string): Promise<void> => {
    setError(null);

    if (!credentials) {
      setError('Not authenticated');
      return;
    }

    if (!selectedWorkspace) {
      setError('No workspace selected');
      return;
    }

    if (!agent) {
      setError('No agent created. Call createAgent first.');
      return;
    }

    // Add user message
    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: prompt,
      timestamp: new Date(),
    };
    addMessage(userMessage);

    // Create assistant message placeholder
    const assistantId = generateId();
    currentMessageIdRef.current = assistantId;
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
      toolCalls: [],
      visualizations: [],
    };
    addMessage(assistantMessage);

    // Set loading state
    setIsStreaming(true);
    setIsQueryRunning(true);
    setQueryStartTime(Date.now());
    setToolCalls([]);

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    let fullContent = '';

    try {
      // Execute with agent's custom configuration
      const response = await executeQueryWithConfig(
        credentials,
        prompt,
        selectedWorkspace.workspaceId,
        {
          networkMode: agent.config.networkMode || 'SANDBOX',
          systemPrompt: agent.config.systemPrompt,
          tools: agent.config.tools,
        },
        clientConfig
      );

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
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
              updateMessage(assistantId, { content: fullContent });
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
              updateMessage(assistantId, { toolCalls: [...currentToolCalls] });
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
                updateMessage(assistantId, { toolCalls: [...currentToolCalls] });
              }
            }
            break;

          case 'visualization':
            if (event.data) {
              const viz = event.data as VisualizationData;
              currentVisualizations.push(viz);
              addVisualization(viz);
              updateMessage(assistantId, { visualizations: [...currentVisualizations] });
            }
            break;

          case 'error':
            setError(event.error || 'Query failed');
            break;

          case 'done':
          case 'complete':
            // Query complete
            break;
        }
      }

      // Mark message as complete
      updateMessage(assistantId, {
        content: fullContent,
        isStreaming: false,
        toolCalls: currentToolCalls,
        visualizations: currentVisualizations,
      });

      // Record agent usage
      factory.recordAgentUsage(agent.id);

      // Refresh artifacts if tools were used
      if (currentToolCalls.length > 0) {
        await Promise.all([
          refreshDatasets(),
          refreshVisualizations(),
        ]);
      }

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Query failed';
      setError(message);

      updateMessage(assistantId, {
        content: fullContent || `Error: ${message}`,
        isStreaming: false,
      });
    } finally {
      setIsStreaming(false);
      setIsQueryRunning(false);
      setQueryStartTime(null);
      currentMessageIdRef.current = null;
      abortControllerRef.current = null;
    }
  }, [
    credentials,
    selectedWorkspace,
    agent,
    addMessage,
    updateMessage,
    setIsQueryRunning,
    setQueryStartTime,
    addVisualization,
    refreshDatasets,
    refreshVisualizations,
    clientConfig,
    factory,
  ]);

  /**
   * Reset agent and messages
   */
  const reset = useCallback(() => {
    // Cancel any ongoing query
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setAgent(null);
    setError(null);
    setToolCalls([]);
    setIsStreaming(false);
    setIsCreating(false);
    contextClear();
  }, [contextClear]);

  /**
   * List all registered agents
   */
  const listAgents = useCallback((): RegisteredAgent[] => {
    return factory.listAgents();
  }, [factory]);

  /**
   * Switch to a registered agent by ID
   */
  const useRegisteredAgent = useCallback((agentId: string) => {
    const registeredAgent = factory.getAgent(agentId);
    if (registeredAgent) {
      setAgent(registeredAgent);
      factory.recordAgentUsage(agentId);
      setError(null);
    } else {
      setError(`Agent ${agentId} not found`);
    }
  }, [factory]);

  /**
   * Remove an agent by ID
   */
  const removeAgent = useCallback((agentId: string): boolean => {
    const removed = factory.removeAgent(agentId);

    // If removing current agent, clear it
    if (removed && agent?.id === agentId) {
      setAgent(null);
    }

    return removed;
  }, [factory, agent]);

  return {
    createAgent,
    query,
    agent,
    messages,
    isStreaming,
    isCreating,
    toolCalls,
    error,
    reset,
    listAgents,
    useAgent: useRegisteredAgent,
    removeAgent,
  };
}
