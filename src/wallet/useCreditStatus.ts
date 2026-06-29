/**
 * useCreditStatus — polls the backend for daily free credit status.
 *
 * Uses GET /billing/credits/status. No wagmi/viem dependency — works
 * for all users regardless of wallet connection.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useFlowstackOptional } from '../context/FlowstackProvider';
import type { CreditStatus, UseCreditStatusReturn } from './types';

const POLL_INTERVAL_MS = 60_000; // 60 seconds

export function useCreditStatus(): UseCreditStatusReturn {
  const flowstack = useFlowstackOptional();
  const [data, setData] = useState<CreditStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const baseUrl = flowstack?.config?.baseUrl || 'https://sage-api.flowstack.fun';
  const apiKey = flowstack?.credentials?.apiKey;
  const tenantId = flowstack?.credentials?.tenantId;
  const userId = flowstack?.credentials?.userId;

  const fetchStatus = useCallback(async () => {
    if (!apiKey || !userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const resp = await fetch(`${baseUrl}/billing/credits/status?user_id=${userId}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'X-Tenant-ID': tenantId || '',
          'X-User-ID': userId,
        },
      });

      if (!resp.ok) {
        throw new Error(`Credit status check failed: ${resp.status}`);
      }

      const json = await resp.json();
      setData({
        dailyLimit: json.daily_limit,
        usedToday: json.used_today,
        remaining: json.remaining,
        resetsAt: json.resets_at,
        purchasedRemaining: json.purchased_remaining ?? 0,
        totalRemaining: json.total_remaining ?? json.remaining,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch credit status');
    } finally {
      setIsLoading(false);
    }
  }, [apiKey, baseUrl, tenantId, userId]);

  // Initial fetch + polling
  useEffect(() => {
    fetchStatus();

    intervalRef.current = setInterval(fetchStatus, POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchStatus]);

  return { data, isLoading, error, refetch: fetchStatus };
}
