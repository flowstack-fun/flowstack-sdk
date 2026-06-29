/**
 * WalletLinkButton — connects and links a wallet to an existing Google OAuth account.
 *
 * Unlike LoginButton (which creates a new wallet-based user), this component:
 * 1. Connects MetaMask/WalletConnect via wagmi
 * 2. Signs a SIWE message
 * 3. Hits /auth/wallet/link to add wallet_address to the existing user's JWT
 * 4. Updates stored credentials with the new JWT
 *
 * Designed for Casino where users sign in with Google first, then optionally add a wallet.
 */

'use client';

import React, { useState, useCallback } from 'react';
import { useFlowstackOptional } from '../context/FlowstackProvider';

interface WalletLinkButtonProps {
  /** Text shown on the button */
  label?: string;
  /** Callback after successful wallet link */
  onLinked?: (walletAddress: string) => void;
  /** Callback on error */
  onError?: (error: string) => void;
  /** CSS class name */
  className?: string;
  /** Inline styles */
  style?: React.CSSProperties;
}

export function WalletLinkButton({
  label = 'Connect Wallet',
  onLinked,
  onError,
  className,
  style,
}: WalletLinkButtonProps) {
  const flowstack = useFlowstackOptional();
  const [isLinking, setIsLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baseUrl = flowstack?.config?.baseUrl || 'https://sage-api.flowstack.fun';

  const handleLink = useCallback(async () => {
    setIsLinking(true);
    setError(null);

    try {
      // Dynamic imports to avoid bundling wagmi when not used
      const { getAccount, connect, signMessage } = await import('@wagmi/core');
      const { injected } = await import('@wagmi/connectors');

      // Get wagmi config from the global provider
      // WalletLinkButton must be rendered inside WagmiProvider
      const wagmiConfig = window.__wagmiConfig;
      if (!wagmiConfig) {
        throw new Error('WagmiProvider not found. Wrap your app in WagmiProvider.');
      }

      // 1. Connect wallet if not already connected
      let account = getAccount(wagmiConfig);
      if (!account.address) {
        await connect(wagmiConfig, { connector: injected() });
        account = getAccount(wagmiConfig);
      }

      if (!account.address) {
        throw new Error('No wallet connected. Please install MetaMask.');
      }

      // 2. Get nonce from backend
      const nonceResp = await fetch(`${baseUrl}/auth/wallet/nonce`);
      if (!nonceResp.ok) throw new Error('Failed to get SIWE nonce');
      const { nonce } = await nonceResp.json();

      // 3. Construct SIWE message
      const domain = typeof window !== 'undefined' ? window.location.host : 'localhost';
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
      const siweMessage = [
        `${domain} wants you to sign in with your Ethereum account:`,
        account.address,
        '',
        'Link wallet to your Casino account',
        '',
        `URI: ${origin}`,
        `Version: 1`,
        `Chain ID: 42161`,
        `Nonce: ${nonce}`,
        `Issued At: ${new Date().toISOString()}`,
      ].join('\n');

      // 4. Sign with wallet
      const signature = await signMessage(wagmiConfig, { message: siweMessage });

      // 5. Link wallet to existing account (requires existing Bearer token)
      const apiKey = flowstack?.credentials?.apiKey;
      if (!apiKey) throw new Error('Must be signed in to link a wallet');

      const linkResp = await fetch(`${baseUrl}/auth/wallet/link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'X-Tenant-ID': flowstack?.credentials?.tenantId || '',
        },
        body: JSON.stringify({ message: siweMessage, signature }),
      });

      if (!linkResp.ok) {
        const err = await linkResp.json();
        throw new Error(err.detail || 'Wallet linking failed');
      }

      const data = await linkResp.json();

      // 6. Update stored credentials with new JWT containing wallet_address
      if (flowstack?.setCredentials) {
        flowstack.setCredentials({
          apiKey: data.session_token,
          tenantId: data.tenant_id,
          userId: data.user_id,
          expiresAt: data.expires_at,
        });
      }

      onLinked?.(data.wallet_address);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Wallet linking failed';
      setError(msg);
      onError?.(msg);
    } finally {
      setIsLinking(false);
    }
  }, [baseUrl, flowstack, onLinked, onError]);

  return (
    <button
      onClick={handleLink}
      disabled={isLinking}
      className={className}
      style={{
        ...defaultStyle,
        ...style,
        opacity: isLinking ? 0.6 : 1,
        cursor: isLinking ? 'wait' : 'pointer',
      }}
    >
      {isLinking ? 'Linking...' : label}
      {error && (
        <span style={{ display: 'block', color: '#d44343', fontSize: '11px', marginTop: '4px' }}>
          {error}
        </span>
      )}
    </button>
  );
}

const defaultStyle: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: '8px',
  border: '1px solid #333',
  backgroundColor: '#1a1a1a',
  color: '#fff',
  fontSize: '14px',
  fontFamily: 'var(--font-body, Inter, sans-serif)',
};
