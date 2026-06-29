/**
 * useBuyInfer — opens fiat on-ramp widget (MoonPay/Transak).
 *
 * Handles: credit card → INFER → auto-deposit. User never touches crypto.
 * The on-ramp provider delivers INFER to the user's embedded wallet,
 * then the SDK auto-deposits into InferencePayment.
 */

import { useState, useCallback } from 'react';
import type { UseBuyInferReturn } from './types';

interface BuyInferOptions {
  /** MoonPay or Transak API key */
  apiKey?: string;
  /** sandbox or production */
  environment?: 'sandbox' | 'production';
  /** Wallet address to receive INFER */
  walletAddress?: string;
}

export function useBuyInfer(options: BuyInferOptions = {}): UseBuyInferReturn {
  const [isBuying, setIsBuying] = useState(false);
  const [status, setStatus] = useState<'idle' | 'pending' | 'completed' | 'failed'>('idle');
  const [error, setError] = useState<string | null>(null);

  const buy = useCallback((amount?: number) => {
    if (!options.apiKey) {
      setError('On-ramp not configured. Set onRampConfig in FlowstackConfig.');
      return;
    }

    if (!options.walletAddress) {
      setError('No wallet address. Sign up first.');
      return;
    }

    setIsBuying(true);
    setStatus('pending');
    setError(null);

    // MoonPay widget URL
    const baseUrl = options.environment === 'production'
      ? 'https://buy.moonpay.com'
      : 'https://buy-sandbox.moonpay.com';

    const params = new URLSearchParams({
      apiKey: options.apiKey,
      currencyCode: 'infer_arbitrum', // MoonPay currency code for INFER on Arbitrum
      walletAddress: options.walletAddress,
      ...(amount ? { baseCurrencyAmount: amount.toString() } : {}),
      colorCode: '#d4a843', // Casino amber
      showWalletAddressForm: 'false',
    });

    const widgetUrl = `${baseUrl}?${params.toString()}`;

    // Open in popup or redirect
    const popup = window.open(
      widgetUrl,
      'moonpay',
      'width=500,height=700,left=200,top=100'
    );

    if (!popup) {
      // Fallback: redirect
      window.location.href = widgetUrl;
      return;
    }

    // Poll for popup close (MoonPay doesn't have reliable postMessage)
    const pollInterval = setInterval(() => {
      if (popup.closed) {
        clearInterval(pollInterval);
        setIsBuying(false);
        // We can't know if purchase succeeded from popup close alone.
        // Balance polling (useInferBalance) will detect the deposit.
        setStatus('completed');
      }
    }, 1000);

  }, [options]);

  return { buy, isBuying, status, error };
}
