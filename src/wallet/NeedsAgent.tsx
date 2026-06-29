/**
 * NeedsAgent — gating component for AGENT-token-gated features in built apps.
 *
 * Checks the user's AGENT balance. If sufficient, renders children and calls
 * onProceed when the user activates the gated action. If insufficient, renders
 * a "Get AGENT" CTA that deep-links to the OIF /buy page with returnTo + need
 * params so the user lands back in the app after purchasing.
 *
 * Usage:
 *   <NeedsAgent amountNeeded={2} onProceed={generateAlbumArt} returnUrl={window.location.href}>
 *     <p>Generate a new design for 2 AGENT</p>
 *   </NeedsAgent>
 *
 * The user never sees a seed phrase — Privy handles wallet creation on OIF.
 * No auth setup required in the built app: the component works for anonymous users
 * (balance will read 0) and authenticated wallet users alike.
 */

import React from 'react';
import { useAgentBalance } from './useAgentBalance';
import type { NeedsAgentProps } from './types';

const DEFAULT_OIF_BASE = 'https://openinferencefoundation.org';

export function NeedsAgent({
  amountNeeded,
  onProceed,
  returnUrl,
  children,
  oifBaseUrl = DEFAULT_OIF_BASE,
}: NeedsAgentProps): React.ReactElement {
  const { data, isLoading } = useAgentBalance();
  const available = data?.available ?? 0;
  const hasSufficient = available >= amountNeeded;

  const handleGetAgent = () => {
    const base = oifBaseUrl.replace(/\/$/, '');
    const returnTo = returnUrl ?? (typeof window !== 'undefined' ? window.location.href : '');
    const url = `${base}/buy?returnTo=${encodeURIComponent(returnTo)}&need=${amountNeeded}`;
    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  if (isLoading) {
    return (
      <div style={{ opacity: 0.6, pointerEvents: 'none' }}>
        {children}
      </div>
    );
  }

  if (hasSufficient) {
    return (
      <div onClick={onProceed} style={{ cursor: 'pointer' }}>
        {children}
      </div>
    );
  }

  return (
    <div>
      {children && <div style={{ opacity: 0.5, pointerEvents: 'none' }}>{children}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
        <p style={{ margin: 0, fontSize: '0.85em', color: '#888' }}>
          You need {amountNeeded} AGENT to use this feature.
          {data !== null && ` You have ${available.toFixed(2)}.`}
        </p>
        <button
          onClick={handleGetAgent}
          style={{
            background: '#6366f1',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '6px 14px',
            fontSize: '0.875em',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Get AGENT →
        </button>
      </div>
    </div>
  );
}
