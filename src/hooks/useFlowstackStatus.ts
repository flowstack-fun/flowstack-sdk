'use client';

/**
 * useFlowstackStatus Hook
 *
 * Monitors connection status and health of the Flowstack backend.
 *
 * @example
 * ```tsx
 * function StatusIndicator() {
 *   const { isConnected, latency, status } = useFlowstackStatus();
 *
 *   return (
 *     <div>
 *       Status: {status}
 *       {latency && ` (${latency}ms)`}
 *     </div>
 *   );
 * }
 * ```
 */

import { useState, useEffect, useCallback } from 'react';
import { useFlowstack } from '../context/FlowstackProvider';

export type ConnectionStatus = 'unknown' | 'connecting' | 'connected' | 'disconnected' | 'error';

export interface UseFlowstackStatusReturn {
  /** Current connection status */
  status: ConnectionStatus;
  /** Whether connected to backend */
  isConnected: boolean;
  /** Whether currently checking connection */
  isChecking: boolean;
  /** Last measured latency in milliseconds */
  latency: number | null;
  /** Last successful connection time */
  lastConnected: Date | null;
  /** Last error message if any */
  error: string | null;
  /** Manually trigger a connection check */
  checkConnection: () => Promise<void>;
}

export interface UseFlowstackStatusOptions {
  /** Polling interval in milliseconds (default: 30000) */
  pollInterval?: number;
  /** Whether to poll automatically (default: true) */
  autoPoll?: boolean;
  /** Whether to check on mount (default: true) */
  checkOnMount?: boolean;
}

/**
 * Hook for monitoring Flowstack backend status
 */
export function useFlowstackStatus(options: UseFlowstackStatusOptions = {}): UseFlowstackStatusReturn {
  const {
    pollInterval = 30000,
    autoPoll = true,
    checkOnMount = true,
  } = options;

  const { config } = useFlowstack();

  const [status, setStatus] = useState<ConnectionStatus>('unknown');
  const [isChecking, setIsChecking] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);
  const [lastConnected, setLastConnected] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const baseUrl = config.baseUrl || 'https://sage-api.flowstack.fun';

  const checkConnection = useCallback(async () => {
    if (isChecking) return;

    setIsChecking(true);
    setStatus('connecting');
    setError(null);

    const start = Date.now();

    try {
      // Try to reach the health endpoint
      const response = await fetch(`${baseUrl}/health`, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
      });

      const elapsed = Date.now() - start;
      setLatency(elapsed);

      if (response.ok) {
        setStatus('connected');
        setLastConnected(new Date());
        setError(null);
      } else {
        setStatus('error');
        setError(`Server returned ${response.status}`);
      }
    } catch (err) {
      setStatus('disconnected');
      setLatency(null);
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setIsChecking(false);
    }
  }, [baseUrl, isChecking]);

  // Check on mount
  useEffect(() => {
    if (checkOnMount) {
      checkConnection();
    }
  }, [checkOnMount]); // eslint-disable-line react-hooks/exhaustive-deps

  // Set up polling
  useEffect(() => {
    if (!autoPoll || pollInterval <= 0) return;

    const interval = setInterval(checkConnection, pollInterval);
    return () => clearInterval(interval);
  }, [autoPoll, pollInterval, checkConnection]);

  return {
    status,
    isConnected: status === 'connected',
    isChecking,
    latency,
    lastConnected,
    error,
    checkConnection,
  };
}
