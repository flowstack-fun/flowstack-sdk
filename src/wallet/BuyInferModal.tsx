/**
 * BuyInferModal — fiat on-ramp widget for purchasing INFER with a credit card.
 *
 * Wraps MoonPay/Transak with Casino-branded pricing tiers.
 */

'use client';

import React, { useState } from 'react';
import { useBuyInfer } from './useBuyInfer';

interface BuyInferModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Close callback */
  onClose: () => void;
  /** MoonPay/Transak API key */
  apiKey: string;
  /** sandbox or production */
  environment?: 'sandbox' | 'production';
  /** User's wallet address */
  walletAddress: string;
  /** INFER per query (for pricing display) */
  inferPerQuery?: number;
  /** CSS class name */
  className?: string;
}

const TIERS = [
  { queries: 100, infer: 5000, price: 5 },
  { queries: 500, infer: 25000, price: 25 },
  { queries: 2000, infer: 100000, price: 95 },
];

export function BuyInferModal({
  isOpen,
  onClose,
  apiKey,
  environment = 'sandbox',
  walletAddress,
  inferPerQuery = 50,
  className,
}: BuyInferModalProps) {
  const { buy, isBuying, status } = useBuyInfer({
    apiKey,
    environment,
    walletAddress,
  });
  const [selectedTier, setSelectedTier] = useState(1); // Default: 500 queries

  if (!isOpen) return null;

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div
        className={className}
        style={modalStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', color: '#f5f0e8' }}>Buy Query Credits</h2>
          <button onClick={onClose} style={closeStyle}>&times;</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          {TIERS.map((tier, i) => (
            <button
              key={tier.queries}
              onClick={() => setSelectedTier(i)}
              style={{
                ...tierStyle,
                borderColor: selectedTier === i ? '#d4a843' : '#333',
                backgroundColor: selectedTier === i ? '#1a1a0a' : '#1a1a1a',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: '16px', color: '#f5f0e8' }}>
                {tier.queries} queries
              </div>
              <div style={{ color: '#d4a843', fontWeight: 700, fontSize: '18px' }}>
                ${tier.price}
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={() => buy(TIERS[selectedTier].price)}
          disabled={isBuying}
          style={{
            ...buyStyle,
            opacity: isBuying ? 0.7 : 1,
            cursor: isBuying ? 'not-allowed' : 'pointer',
          }}
        >
          {isBuying ? 'Processing...' : `Buy ${TIERS[selectedTier].queries} queries — $${TIERS[selectedTier].price}`}
        </button>

        <p style={{ color: '#666', fontSize: '12px', textAlign: 'center', marginTop: '12px' }}>
          Powered by MoonPay. Visa, Mastercard, Apple Pay accepted.
        </p>
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
};

const modalStyle: React.CSSProperties = {
  backgroundColor: '#111111',
  borderRadius: '16px',
  border: '1px solid #333',
  padding: '24px',
  width: '100%',
  maxWidth: '420px',
  fontFamily: 'var(--font-body, Inter, sans-serif)',
};

const closeStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#666',
  fontSize: '24px',
  cursor: 'pointer',
  padding: '4px 8px',
};

const tierStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '16px 20px',
  borderRadius: '12px',
  border: '1px solid #333',
  cursor: 'pointer',
  transition: 'border-color 0.15s',
};

const buyStyle: React.CSSProperties = {
  padding: '14px 32px',
  borderRadius: '8px',
  border: 'none',
  backgroundColor: '#d4a843',
  color: '#0a0a0a',
  fontWeight: 700,
  fontSize: '16px',
  width: '100%',
};
