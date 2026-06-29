/**
 * AppPaywall — access gate for monetized built apps (P0-121).
 *
 * Renders children when the end-user has access. When `hasAccess` is false,
 * renders a paywall overlay with the unlock CTA. Listens for the `app_paywall`
 * SSE event emitted by the backend gate and triggers the paywall immediately.
 *
 * Usage (minimal — backend enforces regardless):
 *   import { AppPaywall } from 'flowstack-sdk/wallet';
 *
 *   function App() {
 *     return (
 *       <AppPaywall siteId={config.appScope}>
 *         <YourAppContent />
 *       </AppPaywall>
 *     );
 *   }
 *
 * The backend's AppAccessGate fires a 402 or an `app_paywall` SSE event if the
 * user is blocked. This component surfaces that as a UI gate. It does NOT replace
 * backend enforcement — the backend always has the final say.
 */

import React, { useEffect, useState } from 'react';
import { useAppAccess } from './useAppAccess';
import type { AppPaywallProps } from './types';

export function AppPaywall({ siteId, builderTenantId, children, onBlocked }: AppPaywallProps) {
  const {
    hasAccess,
    queriesRemaining,
    paymentMode,
    unlockPriceCents,
    unlockPriceLabel,
    isLoading,
    checkout,
  } = useAppAccess(siteId, { builderTenantId });

  const [serverBlocked, setServerBlocked] = useState(false);
  const [serverBlockReason, setServerBlockReason] = useState<string | null>(null);

  // Listen for app_paywall SSE event dispatched by the useAgent hook
  useEffect(() => {
    function handlePaywall(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;
      if (detail.site_id && detail.site_id !== siteId) return;
      setServerBlocked(true);
      setServerBlockReason(detail.code || 'payment_required');
      onBlocked?.(detail.code || 'payment_required');
    }
    window.addEventListener('flowstack:app_paywall', handlePaywall);
    return () => window.removeEventListener('flowstack:app_paywall', handlePaywall);
  }, [siteId, onBlocked]);

  const showPaywall = serverBlocked || (!isLoading && !hasAccess);

  if (!showPaywall) {
    return <>{children}</>;
  }

  const reason = serverBlockReason || (queriesRemaining === 0 ? 'free_tier_exhausted' : 'payment_required');
  const priceLabel = unlockPriceLabel || (unlockPriceCents ? `$${(unlockPriceCents / 100).toFixed(2)}` : 'Unlock app');
  const showAgentOption = paymentMode === 'agent' || paymentMode === 'both';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.72)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        style={{
          background: '#111',
          border: '1px solid #333',
          borderRadius: '12px',
          padding: '32px',
          maxWidth: '360px',
          width: '90vw',
          textAlign: 'center',
          color: '#fff',
        }}
      >
        <p
          style={{
            fontSize: '10px',
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            color: '#888',
            marginBottom: '12px',
          }}
        >
          {reason === 'free_tier_exhausted' ? 'Free queries used' : 'Access required'}
        </p>

        {reason === 'free_tier_exhausted' && (
          <p style={{ fontSize: '13px', color: '#aaa', marginBottom: '20px' }}>
            You've used your free queries for this month.
            Unlock unlimited access below.
          </p>
        )}

        {reason === 'payment_required' && (
          <p style={{ fontSize: '13px', color: '#aaa', marginBottom: '20px' }}>
            This app requires payment to access.
          </p>
        )}

        {/* Stripe unlock CTA */}
        <button
          onClick={() => checkout()}
          style={{
            width: '100%',
            padding: '12px 24px',
            background: '#6366f1',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            marginBottom: showAgentOption ? '8px' : '0',
          }}
        >
          {priceLabel}
        </button>

        {/* AGENT alternative */}
        {showAgentOption && (
          <p
            style={{
              fontSize: '11px',
              color: '#666',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.open(`https://openinferencefoundation.org/buy?returnTo=${encodeURIComponent(window.location.href)}`, '_blank');
              }
            }}
          >
            Or pay with AGENT tokens
          </p>
        )}
      </div>
    </div>
  );
}
