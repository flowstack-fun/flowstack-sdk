/**
 * InferBalanceBadge — shows INFER balance in a compact badge.
 *
 * Displays query credits remaining. Shows "Buy More" when low.
 */

'use client';

import React from 'react';
import { useInferBalance } from './useInferBalance';

interface InferBalanceBadgeProps {
  /** Threshold to show "Buy More" warning */
  lowBalanceThreshold?: number;
  /** Callback when "Buy More" is clicked */
  onBuyMore?: () => void;
  /** CSS class name */
  className?: string;
}

export function InferBalanceBadge({
  lowBalanceThreshold = 5,
  onBuyMore,
  className,
}: InferBalanceBadgeProps) {
  const { data, isLoading } = useInferBalance();

  if (isLoading && !data) {
    return (
      <span className={className} style={{ ...badgeStyle, opacity: 0.5 }}>
        ...
      </span>
    );
  }

  if (!data) return null;

  const isLow = data.queryCredits <= lowBalanceThreshold;

  return (
    <span
      className={className}
      style={{
        ...badgeStyle,
        backgroundColor: isLow ? '#3a1c1c' : '#1a1a1a',
        borderColor: isLow ? '#d44343' : '#333',
      }}
    >
      <span style={{ color: isLow ? '#d44343' : '#d4a843', fontWeight: 600 }}>
        {data.queryCredits}
      </span>
      <span style={{ color: '#c4bdb3', marginLeft: '4px', fontSize: '12px' }}>
        queries
      </span>
      {isLow && onBuyMore && (
        <button
          onClick={onBuyMore}
          style={{
            marginLeft: '8px',
            padding: '2px 8px',
            borderRadius: '4px',
            border: '1px solid #d4a843',
            backgroundColor: 'transparent',
            color: '#d4a843',
            fontSize: '11px',
            cursor: 'pointer',
          }}
        >
          Buy More
        </button>
      )}
    </span>
  );
}

const badgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '4px 12px',
  borderRadius: '20px',
  border: '1px solid #333',
  fontSize: '13px',
  fontFamily: 'var(--font-body, Inter, sans-serif)',
};
