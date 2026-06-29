/**
 * PaymentRequired — shown when user's INFER balance is insufficient (402).
 *
 * Displays current balance and a "Buy INFER" CTA.
 */

'use client';

import React from 'react';

interface PaymentRequiredProps {
  /** Current balance in query credits */
  queryCredits?: number;
  /** INFER tokens needed per query */
  inferPerQuery?: number;
  /** Callback to open buy flow */
  onBuy?: () => void;
  /** Callback to dismiss */
  onDismiss?: () => void;
  /** CSS class name */
  className?: string;
}

export function PaymentRequired({
  queryCredits = 0,
  inferPerQuery = 50,
  onBuy,
  onDismiss,
  className,
}: PaymentRequiredProps) {
  return (
    <div className={className} style={containerStyle}>
      <div style={{ fontSize: '24px', marginBottom: '8px' }}>0 queries remaining</div>
      <p style={{ color: '#c4bdb3', marginBottom: '16px', lineHeight: 1.5 }}>
        Each query costs {inferPerQuery} INFER. Buy more to continue using Casino.
      </p>

      <button onClick={onBuy} style={buyButtonStyle}>
        Buy INFER
      </button>

      <p style={{ color: '#666', fontSize: '12px', marginTop: '12px' }}>
        Pay with credit card. No crypto knowledge needed.
      </p>

      {onDismiss && (
        <button onClick={onDismiss} style={dismissStyle}>
          Maybe later
        </button>
      )}
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '32px 24px',
  backgroundColor: '#111111',
  borderRadius: '12px',
  border: '1px solid #333',
  maxWidth: '400px',
  margin: '0 auto',
  fontFamily: 'var(--font-body, Inter, sans-serif)',
  color: '#f5f0e8',
};

const buyButtonStyle: React.CSSProperties = {
  padding: '14px 32px',
  borderRadius: '8px',
  border: 'none',
  backgroundColor: '#d4a843',
  color: '#0a0a0a',
  fontWeight: 700,
  fontSize: '16px',
  cursor: 'pointer',
  width: '100%',
};

const dismissStyle: React.CSSProperties = {
  marginTop: '8px',
  padding: '8px',
  background: 'none',
  border: 'none',
  color: '#666',
  fontSize: '13px',
  cursor: 'pointer',
};
