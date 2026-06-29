/**
 * useAgentBalance — polls the backend for AGENT token balance.
 *
 * Uses GET /billing/agent/balance which reads on-chain AGENT balance
 * from the AgentPayment contract and subtracts active holds.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useFlowstackOptional } from '../context/FlowstackProvider';
import type { AgentBalance, UseAgentBalanceReturn } from './types';

const POLL_INTERVAL_MS = 15_000; // 15 seconds

export function useAgentBalance(): UseAgentBalanceReturn {
  const flowstack = useFlowstackOptional();
  const [data, setData] = useState<AgentBalance | null>(null);
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
      const resp = await fetch(`${baseUrl}/billing/agent/balance`, {
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
        throw new Error(`AGENT balance check failed: ${resp.status}`);
      }

      const json = await resp.json();
      setData({
        balanceWei: json.balance_wei,
        heldWei: json.held_wei,
        availableWei: json.available_wei,
        balance: json.agent_balance,
        available: json.agent_available,
        buildCredits: json.build_credits,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch AGENT balance');
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
