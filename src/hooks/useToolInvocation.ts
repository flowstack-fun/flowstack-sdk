'use client';

/**
 * useToolInvocation — Direct tool invocation hook.
 *
 * Calls an agent tool directly, bypassing LLM orchestration. Use for tools
 * marked with invocationPattern: "direct" in the agent manifest.
 *
 * Returns structured JSON (not streaming). Ideal for:
 * - Form submissions (mongodb_insert)
 * - Data fetching (mongodb_query)
 * - Single-purpose operations (list, describe, aggregate)
 *
 * For complex workflows requiring LLM reasoning, use useAgent instead.
 *
 * @example
 * ```tsx
 * function TransactionForm() {
 *   const { invoke, isLoading } = useToolInvocation({
 *     agentName: 'finance_agent',
 *     toolName: 'mongodb_insert',
 *   });
 *
 *   const handleSubmit = async (data: FormData) => {
 *     const result = await invoke({
 *       collection: 'transactions',
 *       document: { date: data.date, amount: data.amount },
 *     });
 *   };
 * }
 * ```
 *
 * @example
 * ```tsx
 * function TransactionTable() {
 *   const { invoke, result, isLoading } = useToolInvocation({
 *     agentName: 'finance_agent',
 *     toolName: 'mongodb_query',
 *   });
 *
 *   useEffect(() => {
 *     invoke({ collection: 'transactions', sort: { date: -1 }, limit: 50 });
 *   }, []);
 *
 *   return isLoading ? <Spinner /> : (
 *     <table>{result?.map(row => <tr key={row._id}>...</tr>)}</table>
 *   );
 * }
 * ```
 */

import { useState, useCallback, useRef } from 'react';
import { useFlowstack } from '../context/FlowstackProvider';
import { invokeTool } from '../api/client';

export interface UseToolInvocationOptions {
  /** Target agent name (e.g. "finance_agent") */
  agentName: string;
  /** Tool to invoke (e.g. "mongodb_query") */
  toolName: string;
}

export interface UseToolInvocationReturn<T = any> {
  /** Call the tool with keyword arguments */
  invoke: (kwargs?: Record<string, any>) => Promise<T | null>;
  /** Last successful result */
  result: T | null;
  /** True while the tool call is in flight */
  isLoading: boolean;
  /** Error message from the last failed call */
  error: string | null;
  /** Reset result and error state */
  reset: () => void;
}

export function useToolInvocation<T = any>(
  options: UseToolInvocationOptions
): UseToolInvocationReturn<T> {
  const { agentName, toolName } = options;
  const { credentials, config } = useFlowstack();

  const [result, setResult] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prevent concurrent calls to the same tool
  const inflightRef = useRef(false);

  const invoke = useCallback(
    async (kwargs: Record<string, any> = {}): Promise<T | null> => {
      if (!credentials) {
        const msg = 'Not authenticated — cannot invoke tool';
        setError(msg);
        console.error(`[useToolInvocation] ${msg}`);
        return null;
      }

      if (inflightRef.current) {
        console.warn(`[useToolInvocation] ${agentName}.${toolName} already in flight — skipping`);
        return null;
      }

      inflightRef.current = true;
      setIsLoading(true);
      setError(null);

      try {
        const response = await invokeTool<T>(
          credentials,
          agentName,
          toolName,
          kwargs,
          config,
        );

        if (!response.ok) {
          const errMsg = response.error || `Tool invocation failed (${response.status})`;
          setError(errMsg);
          console.error(`[useToolInvocation] ${agentName}.${toolName} failed:`, errMsg);
          return null;
        }

        const toolResult = response.data?.result ?? (response.data as any);
        setResult(toolResult);
        return toolResult;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Tool invocation failed';
        setError(errMsg);
        console.error(`[useToolInvocation] ${agentName}.${toolName} error:`, err);
        return null;
      } finally {
        inflightRef.current = false;
        setIsLoading(false);
      }
    },
    [credentials, config, agentName, toolName]
  );

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { invoke, result, isLoading, error, reset };
}
