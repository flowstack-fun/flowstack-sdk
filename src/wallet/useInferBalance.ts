/**
 * useInferBalance — polls the backend for INFER token balance.
 *
 * Uses GET /billing/infer/balance which reads on-chain balance
 * and subtracts active holds.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useFlowstackOptional } from '../context/FlowstackProvider';
import type { InferBalance, UseInferBalanceReturn } from './types';

const POLL_INTERVAL_MS = 15_000; // 15 seconds

export function useInferBalance(): UseInferBalanceReturn {
  const flowstack = useFlowstackOptional();
  const [data, setData] = useState<InferBalance | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const baseUrl = flowstack?.config?.baseUrl || 'https://sage-api.flowstack.fun';
  const apiKey = flowstack?.credentials?.apiKey;
  const tenantId = flowstack?.credentials?.tenantId;

  const fetchBalance = useCallback(async () => {
    if (!apiKey) return;

    setIsLoading(true);
    setError(null);

    try {
      const resp = await fetch(`${baseUrl}/billing/infer/balance`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'X-Tenant-ID': tenantId || '',
        },
      });

      if (resp.status === 400) {
        // No wallet connected — not an error, just no balance
        setData(null);
        return;
      }

      if (!resp.ok) {
        throw new Error(`Balance check failed: ${resp.status}`);
      }

      const json = await resp.json();
      setData({
        balanceWei: json.balance_wei,
        heldWei: json.held_wei,
        availableWei: json.available_wei,
        balance: json.infer_balance,
        available: json.infer_available,
        queryCredits: json.query_credits,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch balance');
    } finally {
      setIsLoading(false);
    }
  }, [apiKey, baseUrl, tenantId]);

  // Initial fetch + polling
  useEffect(() => {
    fetchBalance();

    intervalRef.current = setInterval(fetchBalance, POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchBalance]);

  return { data, isLoading, error, refetch: fetchBalance };
}
