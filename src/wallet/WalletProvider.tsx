/**
 * WalletProvider — wraps Privy + wagmi + react-query in the correct hierarchy.
 *
 * Provider order (per Privy docs):
 *   PrivyProvider > QueryClientProvider > WagmiProvider (@privy-io/wagmi)
 *
 * When `privyAppId` is omitted the provider renders children directly
 * (SIWE-only mode). Hooks that depend on Privy will be unavailable.
 */

'use client';

import React, { createContext, useContext, useMemo, useState } from 'react';
import { PrivyProvider } from '@privy-io/react-auth';
import { WagmiProvider, createConfig } from '@privy-io/wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { arbitrum, arbitrumSepolia } from 'viem/chains';
import { http, type Transport, injected } from 'wagmi';
import type { WalletProviderProps } from './types';

declare global {
  interface Window {
    __wagmiConfig?: ReturnType<typeof createConfig>;
  }
}

// ---------------------------------------------------------------------------
// Context — lets child hooks know if Privy is available
// ---------------------------------------------------------------------------

interface WalletContextValue {
  /** true when PrivyProvider is in the tree */
  privyReady: boolean;
  /** Casino API base URL passed through from props */
  baseUrl: string;
}

const WalletCtx = createContext<WalletContextValue>({
  privyReady: false,
  baseUrl: 'https://sage-api.flowstack.fun',
});

export const useWalletContext = () => useContext(WalletCtx);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WalletProvider({
  children,
  privyAppId,
  chain = 'arbitrum',
  baseUrl = 'https://sage-api.flowstack.fun',
  walletConnectProjectId,
}: WalletProviderProps) {
  const [queryClient] = useState(() => new QueryClient());
  const selectedChain = chain === 'arbitrum-sepolia' ? arbitrumSepolia : arbitrum;

  const wagmiConfig = useMemo(() => {
    const config = createConfig({
      chains: [selectedChain],
      transports: { [selectedChain.id]: http() } as Record<number, Transport>,
      // Explicit connectors so wagmi always has something to work with.
      // Without these, useConnect().connectors is empty → connectAsync({ connector: undefined })
      // → "undefined is not an object (evaluating 'n.uid')" crash.
      connectors: [
        injected(),  // MetaMask, Rabby, Brave, any browser extension wallet
      ],
    });
    // Expose wagmi config for imperative access (used by WalletLinkButton)
    if (typeof window !== 'undefined') {
      window.__wagmiConfig = config;
    }
    return config;
  }, [selectedChain]);

  // No Privy app ID — render without Privy (SIWE-only mode)
  if (!privyAppId) {
    return (
      <WalletCtx.Provider value={{ privyReady: false, baseUrl }}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </WalletCtx.Provider>
    );
  }

  return (
    <PrivyProvider
      appId={privyAppId}
      config={{
        // Embedded signer — the EOA keypair that controls the smart wallet.
        // Must be created for all users so the smart wallet has a signer.
        // NOTE: @privy-io/react-auth v3 nests createOnLogin per chain
        // (embeddedWallets.ethereum.createOnLogin). The old v2 flat shape
        // (embeddedWallets.createOnLogin) is silently ignored on v3, so NO
        // wallet gets created on login — the user authenticates but has no
        // wallet/address. Use the v3 shape.
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'all-users',
          },
          showWalletUIs: false,
        },
        // EVM smart wallet (ERC-4337) — Kernel/ZeroDev implementation.
        // Must be enabled in the Privy dashboard (Smart wallets → Kernel → Arbitrum).
        // The smart wallet address is what Privy returns as type='smart_wallet'
        // in linked_accounts, and is the canonical address for the token economy.
        // @ts-ignore — 'smart_wallets' may not be in older @privy-io/react-auth types
        smart_wallets: {
          type: 'kernel',
        },
        loginMethods: ['email', 'google', 'apple', 'twitter', 'github', 'linkedin', 'spotify', 'wallet'],
        appearance: { theme: 'dark' },
        defaultChain: selectedChain,
        ...(walletConnectProjectId ? { walletConnectCloudProjectId: walletConnectProjectId } : {}),
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          <WalletCtx.Provider value={{ privyReady: true, baseUrl }}>
            {children}
          </WalletCtx.Provider>
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
