/**
 * LoginButton — "Sign up with Google" / "Connect Wallet" toggle.
 *
 * Default: Privy (email/Google) signup. Toggle to external wallet (MetaMask).
 */

'use client';

import React, { useState, useCallback } from 'react';

interface LoginButtonProps {
  /** Callback after successful auth */
  onSuccess?: (walletAddress: string) => void;
  /** Callback on auth error */
  onError?: (error: string) => void;
  /** Show wallet connect option */
  showWalletOption?: boolean;
  /** CSS class name */
  className?: string;
}

export function LoginButton({
  onSuccess,
  onError,
  showWalletOption = true,
  className,
}: LoginButtonProps) {
  const [mode, setMode] = useState<'signup' | 'wallet'>('signup');
  const [isLoading, setIsLoading] = useState(false);

  const handlePrivyLogin = useCallback(async () => {
    setIsLoading(true);
    try {
      // Privy login is handled by PrivyProvider's login method
      // This component should be used inside WalletProvider which wraps PrivyProvider
      const { usePrivy } = await import('@privy-io/react-auth');
      // Note: hooks can't be dynamically called. This is a placeholder —
      // the actual implementation uses PrivyProvider's context.
      onError?.('Use this component inside WalletProvider');
    } catch (e) {
      onError?.(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  }, [onSuccess, onError]);

  const handleWalletConnect = useCallback(async () => {
    setIsLoading(true);
    try {
      // This triggers wagmi's connect flow
      onError?.('Wallet connect requires WalletProvider context');
    } catch (e) {
      onError?.(e instanceof Error ? e.message : 'Wallet connect failed');
    } finally {
      setIsLoading(false);
    }
  }, [onError]);

  return (
    <div className={className}>
      {mode === 'signup' ? (
        <button
          onClick={handlePrivyLogin}
          disabled={isLoading}
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: '#d4a843',
            color: '#0a0a0a',
            fontWeight: 600,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.7 : 1,
            width: '100%',
          }}
        >
          {isLoading ? 'Signing in...' : 'Sign up with Google'}
        </button>
      ) : (
        <button
          onClick={handleWalletConnect}
          disabled={isLoading}
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            border: '1px solid #c4bdb3',
            backgroundColor: 'transparent',
            color: '#c4bdb3',
            fontWeight: 600,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.7 : 1,
            width: '100%',
          }}
        >
          {isLoading ? 'Connecting...' : 'Connect Wallet'}
        </button>
      )}

      {showWalletOption && (
        <button
          onClick={() => setMode(mode === 'signup' ? 'wallet' : 'signup')}
          style={{
            marginTop: '8px',
            padding: '8px',
            background: 'none',
            border: 'none',
            color: '#c4bdb3',
            fontSize: '13px',
            cursor: 'pointer',
            width: '100%',
            textAlign: 'center',
          }}
        >
          {mode === 'signup'
            ? 'Already have INFER? Connect wallet'
            : 'Sign up with email instead'}
        </button>
      )}
    </div>
  );
}
