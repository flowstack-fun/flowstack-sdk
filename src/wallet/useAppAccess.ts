/**
 * useAppAccess — checks whether the authenticated end-user has access to a
 * monetized built app, and provides a checkout function to unlock it.
 *
 * Polls GET /billing/app-access/status every 60 seconds.
 * On `checkout()` call, opens a Stripe Checkout session for one-time purchase.
 *
 * Usage:
 *   const { hasAccess, queriesRemaining, checkout } = useAppAccess(config.appScope);
 *   if (!hasAccess) return <AppPaywall siteId={config.appScope} ... />;
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useFlowstackOptional } from '../context/FlowstackProvider';
import type { UseAppAccessReturn } from './types';

const POLL_INTERVAL_MS = 60_000; // 60 seconds

export function useAppAccess(
  siteId: string,
  opts?: { builderTenantId?: string }
): UseAppAccessReturn {
  const flowstack = useFlowstackOptional();
  const [hasAccess, setHasAccess] = useState(true); // optimistic until first check
  const [queriesUsed, setQueriesUsed] = useState(0);
  const [queriesRemaining, setQueriesRemaining] = useState<number | null>(null);
  const [paymentMode, setPaymentMode] = useState<'stripe' | 'agent' | 'both' | null>(null);
  const [unlockPriceCents, setUnlockPriceCents] = useState<number | null>(null);
  const [unlockPriceLabel, setUnlockPriceLabel] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const baseUrl = flowstack?.config?.baseUrl || 'https://sage-api.flowstack.fun';
  const apiKey = flowstack?.credentials?.apiKey;

  const fetchStatus = useCallback(async () => {
    if (!siteId || !apiKey) return;

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ site_id: siteId });
      if (opts?.builderTenantId) params.set('builder_tenant_id', opts.builderTenantId);

      const resp = await fetch(`${baseUrl}/billing/app-access/status?${params}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (!resp.ok) {
        // Non-200: fail open rather than blocking the end-user
        setHasAccess(true);
        return;
      }

      const data = await resp.json();
      setHasAccess(data.has_access ?? true);
      setQueriesUsed(data.queries_used ?? 0);
      setQueriesRemaining(data.queries_remaining ?? null);
      setPaymentMode(data.payment_mode ?? null);
      setUnlockPriceCents(data.unlock_price_cents ?? null);
      setUnlockPriceLabel(data.unlock_price_label ?? null);
    } catch (err: any) {
      setError(err.message || 'Failed to check access status');
      // Fail open
      setHasAccess(true);
    } finally {
      setIsLoading(false);
    }
  }, [siteId, apiKey, baseUrl, opts?.builderTenantId]);

  // Initial fetch + polling
  useEffect(() => {
    if (!siteId || !apiKey) return;
    fetchStatus();
    intervalRef.current = setInterval(fetchStatus, POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchStatus, siteId, apiKey]);

  const checkout = useCallback(
    async (checkoutOpts?: { successUrl?: string; cancelUrl?: string }) => {
      if (!apiKey || !siteId) return;

      try {
        const successUrl =
          checkoutOpts?.successUrl ||
          (typeof window !== 'undefined' ? window.location.href : '');
        const cancelUrl =
          checkoutOpts?.cancelUrl ||
          (typeof window !== 'undefined' ? window.location.href : '');

        const resp = await fetch(`${baseUrl}/billing/app-access/checkout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            site_id: siteId,
            success_url: successUrl,
            cancel_url: cancelUrl,
          }),
        });

        if (!resp.ok) {
          const body = await resp.json().catch(() => ({}));
          throw new Error(body.detail || `Checkout failed: ${resp.status}`);
        }

        const data = await resp.json();
        if (data.url && typeof window !== 'undefined') {
          window.location.href = data.url;
        }
      } catch (err: any) {
        setError(err.message || 'Checkout failed');
      }
    },
    [apiKey, siteId, baseUrl]
  );

  return {
    hasAccess,
    queriesUsed,
    queriesRemaining,
    paymentMode,
    unlockPriceCents,
    unlockPriceLabel,
    isLoading,
    error,
    checkout,
    refetch: fetchStatus,
  };
}
