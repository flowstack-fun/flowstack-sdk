/**
 * useWalletAuth — handles both Privy (embedded) and SIWE (external) auth paths.
 *
 * Both paths produce the same result: a JWT with a wallet_address claim
 * stored via the existing FlowstackProvider credential flow.
 */

import { useState, useCallback, useEffect } from 'react';
import { useConfig } from 'wagmi';
import { useFlowstackOptional } from '../context/FlowstackProvider';
import type { UseWalletAuthReturn } from './types';

export function useWalletAuth(): UseWalletAuthReturn {
  const wagmiConfig = useConfig();
  const flowstack = useFlowstackOptional();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [isEmbeddedWallet, setIsEmbeddedWallet] = useState(false);
  const [authMethod, setAuthMethod] = useState<'privy' | 'siwe' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const baseUrl = flowstack?.config?.baseUrl || 'https://sage-api.flowstack.fun';

  // Check if existing credentials have a wallet_address
  useEffect(() => {
    if (flowstack?.credentials?.apiKey) {
      try {
        const parts = flowstack.credentials.apiKey.split('.');
        if (parts.length < 2) return;
        const payload = JSON.parse(atob(parts[1]));
        if (payload.wallet_address) {
          setAddress(payload.wallet_address);
          setIsConnected(true);
          // Can't determine method from JWT alone, but it's authenticated
        }
      } catch {
        // Not a JWT or can't decode — ignore
      }
    }
  }, [flowstack?.credentials]);

  const loginWithPrivy = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Dynamic import to avoid bundling Privy when not used
      const { usePrivy } = await import('@privy-io/react-auth');
      // Note: this hook must be called from within PrivyProvider context.
      // The actual Privy login is triggered via PrivyProvider's login method.
      // This function is called after Privy auth completes with a token.
      throw new Error(
        'loginWithPrivy must be called from a component wrapped in WalletProvider. ' +
        'Use the LoginButton component instead.'
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Privy login failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginWithSIWE = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Dynamic import wagmi core actions
      const { getAccount, signMessage } = await import('@wagmi/core');

      const account = getAccount(wagmiConfig);
      if (!account.address) {
        throw new Error('No wallet connected. Connect MetaMask first.');
      }

      // 1. Get nonce from backend
      const nonceResp = await fetch(`${baseUrl}/auth/wallet/nonce`);
      if (!nonceResp.ok) throw new Error('Failed to get SIWE nonce');
      const { nonce } = await nonceResp.json();

      // 2. Construct SIWE message
      const domain = typeof window !== 'undefined' ? window.location.host : 'localhost';
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
      // Use the actual chain the wallet is connected on — never hardcode.
      // Hardcoding 421614 (Arbitrum Sepolia testnet) caused MetaMask to reject
      // signatures from mainnet wallets (chain 42161).
      const chainId = account.chainId ?? wagmiConfig.chains?.[0]?.id ?? 42161;
      const siweMessage = [
        `${domain} wants you to sign in with your Ethereum account:`,
        account.address,
        '',
        'Sign in to Casino with INFER tokens',
        '',
        `URI: ${origin}`,
        `Version: 1`,
        `Chain ID: ${chainId}`,
        `Nonce: ${nonce}`,
        `Issued At: ${new Date().toISOString()}`,
      ].join('\n');

      // 3. Sign with wallet
      const signature = await signMessage(wagmiConfig, { message: siweMessage });

      // 4. Verify with backend
      const verifyResp = await fetch(`${baseUrl}/auth/wallet/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: siweMessage, signature }),
      });

      if (!verifyResp.ok) {
        const err = await verifyResp.json();
        throw new Error(err.detail || 'SIWE verification failed');
      }

      const data = await verifyResp.json();

      // 5. Store credentials via FlowstackProvider
      if (flowstack?.setCredentials) {
        flowstack.setCredentials({
          apiKey: data.session_token,
          tenantId: data.tenant_id,
          userId: data.user_id,
          expiresAt: data.expires_at,
        });
      }

      setAddress(data.wallet_address);
      setIsConnected(true);
      setIsEmbeddedWallet(false);
      setAuthMethod('siwe');

    } catch (e) {
      setError(e instanceof Error ? e.message : 'SIWE login failed');
    } finally {
      setIsLoading(false);
    }
  }, [baseUrl, flowstack]);

  const login = useCallback(async (method: 'privy' | 'wallet' = 'privy') => {
    if (method === 'privy') {
      await loginWithPrivy();
    } else {
      await loginWithSIWE();
    }
  }, [loginWithPrivy, loginWithSIWE]);

  const logout = useCallback(() => {
    setIsConnected(false);
    setAddress(null);
    setAuthMethod(null);
    setIsEmbeddedWallet(false);
    setError(null);
    flowstack?.logout?.();
  }, [flowstack]);

  return {
    isConnected,
    isLoading,
    address,
    isEmbeddedWallet,
    authMethod,
    error,
    login,
    logout,
  };
}
