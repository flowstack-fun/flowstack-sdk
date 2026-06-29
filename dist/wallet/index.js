'use strict';

var react = require('react');
var wagmi = require('wagmi');
var jsxRuntime = require('react/jsx-runtime');
var reactAuth = require('@privy-io/react-auth');
var wagmi$1 = require('@privy-io/wagmi');
var reactQuery = require('@tanstack/react-query');
var chains = require('viem/chains');

// src/wallet/useWalletAuth.ts

// src/mock/fixtures.ts
({
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1e3).toISOString()
});
[
  {
    workspaceId: "ws_demo_1",
    name: "Demo Workspace",
    description: "A demo workspace for testing",
    datasetCount: 3,
    visualizationCount: 5,
    modelCount: 1,
    createdAt: "2024-01-15T10:00:00Z",
    lastAccessed: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    workspaceId: "ws_analytics",
    name: "Analytics Project",
    description: "Customer analytics and insights",
    datasetCount: 7,
    visualizationCount: 12,
    modelCount: 2,
    createdAt: "2024-02-20T14:30:00Z",
    lastAccessed: new Date(Date.now() - 2 * 24 * 60 * 60 * 1e3).toISOString()
  },
  {
    workspaceId: "ws_ml_project",
    name: "ML Experiments",
    description: "Machine learning model experiments",
    datasetCount: 5,
    visualizationCount: 8,
    modelCount: 4,
    createdAt: "2024-03-10T09:15:00Z",
    lastAccessed: new Date(Date.now() - 7 * 24 * 60 * 60 * 1e3).toISOString()
  }
];
[
  {
    id: "user_mock_123",
    email: "demo@example.com",
    name: "Demo User",
    role: "owner",
    status: "active",
    tenantId: "t_mock_tenant",
    createdAt: "2024-01-01T10:00:00Z",
    lastLoginAt: (/* @__PURE__ */ new Date()).toISOString(),
    lastActivityAt: (/* @__PURE__ */ new Date()).toISOString(),
    metadata: { plan: "pro", company: "Demo Inc" }
  },
  {
    id: "user_admin_456",
    email: "admin@example.com",
    name: "Admin User",
    role: "admin",
    status: "active",
    tenantId: "t_mock_tenant",
    createdAt: "2024-01-15T14:30:00Z",
    lastLoginAt: new Date(Date.now() - 2 * 60 * 60 * 1e3).toISOString(),
    lastActivityAt: new Date(Date.now() - 30 * 60 * 1e3).toISOString()
  },
  {
    id: "user_member_789",
    email: "member@example.com",
    name: "Team Member",
    role: "member",
    status: "active",
    tenantId: "t_mock_tenant",
    createdAt: "2024-02-10T09:00:00Z",
    lastLoginAt: new Date(Date.now() - 24 * 60 * 60 * 1e3).toISOString(),
    lastActivityAt: new Date(Date.now() - 24 * 60 * 60 * 1e3).toISOString()
  },
  {
    id: "user_suspended_101",
    email: "suspended@example.com",
    name: "Suspended User",
    role: "member",
    status: "suspended",
    tenantId: "t_mock_tenant",
    createdAt: "2024-02-20T11:00:00Z",
    lastLoginAt: "2024-03-01T08:00:00Z",
    metadata: { suspendReason: "Policy violation" }
  },
  {
    id: "user_pending_102",
    email: "pending@example.com",
    name: "New User",
    role: "viewer",
    status: "pending_verification",
    tenantId: "t_mock_tenant",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1e3).toISOString()
  }
];
[
  {
    id: "act_1",
    userId: "user_mock_123",
    activityType: "login",
    description: "Logged in from Chrome on macOS",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "act_2",
    userId: "user_mock_123",
    activityType: "query_execute",
    description: 'Executed query: "Show top customers"',
    timestamp: new Date(Date.now() - 30 * 60 * 1e3).toISOString(),
    resourceType: "workspace",
    resourceId: "ws_demo_1"
  },
  {
    id: "act_3",
    userId: "user_mock_123",
    activityType: "dataset_upload",
    description: "Uploaded dataset: sales_data.csv",
    timestamp: new Date(Date.now() - 60 * 60 * 1e3).toISOString(),
    resourceType: "dataset",
    resourceId: "ds_sales"
  },
  {
    id: "act_4",
    userId: "user_mock_123",
    activityType: "workspace_create",
    description: "Created workspace: Analytics Project",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1e3).toISOString(),
    resourceType: "workspace",
    resourceId: "ws_analytics"
  },
  {
    id: "act_5",
    userId: "user_mock_123",
    activityType: "logout",
    description: "Logged out",
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1e3).toISOString()
  }
];
var FlowstackContext = react.createContext(null);
function useFlowstackOptional() {
  return react.useContext(FlowstackContext);
}

// src/wallet/useWalletAuth.ts
function useWalletAuth() {
  const wagmiConfig = wagmi.useConfig();
  const flowstack = useFlowstackOptional();
  const [isConnected, setIsConnected] = react.useState(false);
  const [isLoading, setIsLoading] = react.useState(false);
  const [address, setAddress] = react.useState(null);
  const [isEmbeddedWallet, setIsEmbeddedWallet] = react.useState(false);
  const [authMethod, setAuthMethod] = react.useState(null);
  const [error, setError] = react.useState(null);
  const baseUrl = flowstack?.config?.baseUrl || "https://sage-api.flowstack.fun";
  react.useEffect(() => {
    if (flowstack?.credentials?.apiKey) {
      try {
        const parts = flowstack.credentials.apiKey.split(".");
        if (parts.length < 2) return;
        const payload = JSON.parse(atob(parts[1]));
        if (payload.wallet_address) {
          setAddress(payload.wallet_address);
          setIsConnected(true);
        }
      } catch {
      }
    }
  }, [flowstack?.credentials]);
  const loginWithPrivy = react.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { usePrivy } = await import('@privy-io/react-auth');
      throw new Error(
        "loginWithPrivy must be called from a component wrapped in WalletProvider. Use the LoginButton component instead."
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Privy login failed");
    } finally {
      setIsLoading(false);
    }
  }, []);
  const loginWithSIWE = react.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { getAccount, signMessage } = await import('@wagmi/core');
      const account = getAccount(wagmiConfig);
      if (!account.address) {
        throw new Error("No wallet connected. Connect MetaMask first.");
      }
      const nonceResp = await fetch(`${baseUrl}/auth/wallet/nonce`);
      if (!nonceResp.ok) throw new Error("Failed to get SIWE nonce");
      const { nonce } = await nonceResp.json();
      const domain = typeof window !== "undefined" ? window.location.host : "localhost";
      const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost";
      const chainId = account.chainId ?? wagmiConfig.chains?.[0]?.id ?? 42161;
      const siweMessage = [
        `${domain} wants you to sign in with your Ethereum account:`,
        account.address,
        "",
        "Sign in to Casino with INFER tokens",
        "",
        `URI: ${origin}`,
        `Version: 1`,
        `Chain ID: ${chainId}`,
        `Nonce: ${nonce}`,
        `Issued At: ${(/* @__PURE__ */ new Date()).toISOString()}`
      ].join("\n");
      const signature = await signMessage(wagmiConfig, { message: siweMessage });
      const verifyResp = await fetch(`${baseUrl}/auth/wallet/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: siweMessage, signature })
      });
      if (!verifyResp.ok) {
        const err = await verifyResp.json();
        throw new Error(err.detail || "SIWE verification failed");
      }
      const data = await verifyResp.json();
      if (flowstack?.setCredentials) {
        flowstack.setCredentials({
          apiKey: data.session_token,
          tenantId: data.tenant_id,
          userId: data.user_id,
          expiresAt: data.expires_at
        });
      }
      setAddress(data.wallet_address);
      setIsConnected(true);
      setIsEmbeddedWallet(false);
      setAuthMethod("siwe");
    } catch (e) {
      setError(e instanceof Error ? e.message : "SIWE login failed");
    } finally {
      setIsLoading(false);
    }
  }, [baseUrl, flowstack]);
  const login = react.useCallback(async (method = "privy") => {
    if (method === "privy") {
      await loginWithPrivy();
    } else {
      await loginWithSIWE();
    }
  }, [loginWithPrivy, loginWithSIWE]);
  const logout = react.useCallback(() => {
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
    logout
  };
}
var POLL_INTERVAL_MS = 15e3;
function useInferBalance() {
  const flowstack = useFlowstackOptional();
  const [data, setData] = react.useState(null);
  const [isLoading, setIsLoading] = react.useState(false);
  const [error, setError] = react.useState(null);
  const intervalRef = react.useRef(null);
  const baseUrl = flowstack?.config?.baseUrl || "https://sage-api.flowstack.fun";
  const apiKey = flowstack?.credentials?.apiKey;
  const tenantId = flowstack?.credentials?.tenantId;
  const fetchBalance = react.useCallback(async () => {
    if (!apiKey) return;
    setIsLoading(true);
    setError(null);
    try {
      const resp = await fetch(`${baseUrl}/billing/infer/balance`, {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "X-Tenant-ID": tenantId || ""
        }
      });
      if (resp.status === 400) {
        setData(null);
        return;
      }
      if (!resp.ok) {
        throw new Error(`Balance check failed: ${resp.status}`);
      }
      const json = await resp.json();
      setData({
        balanceWei: json.balance_wei,
        heldWei: json.held_wei,
        availableWei: json.available_wei,
        balance: json.infer_balance,
        available: json.infer_available,
        queryCredits: json.query_credits
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch balance");
    } finally {
      setIsLoading(false);
    }
  }, [apiKey, baseUrl, tenantId]);
  react.useEffect(() => {
    fetchBalance();
    intervalRef.current = setInterval(fetchBalance, POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchBalance]);
  return { data, isLoading, error, refetch: fetchBalance };
}
var POLL_INTERVAL_MS2 = 15e3;
function useAgentBalance() {
  const flowstack = useFlowstackOptional();
  const [data, setData] = react.useState(null);
  const [isLoading, setIsLoading] = react.useState(false);
  const [error, setError] = react.useState(null);
  const intervalRef = react.useRef(null);
  const baseUrl = flowstack?.config?.baseUrl || "https://sage-api.flowstack.fun";
  const apiKey = flowstack?.credentials?.apiKey;
  const tenantId = flowstack?.credentials?.tenantId;
  const fetchBalance = react.useCallback(async () => {
    if (!apiKey) return;
    setIsLoading(true);
    setError(null);
    try {
      const resp = await fetch(`${baseUrl}/billing/agent/balance`, {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "X-Tenant-ID": tenantId || ""
        }
      });
      if (resp.status === 400) {
        setData(null);
        return;
      }
      if (!resp.ok) {
        throw new Error(`AGENT balance check failed: ${resp.status}`);
      }
      const json = await resp.json();
      setData({
        balanceWei: json.balance_wei,
        heldWei: json.held_wei,
        availableWei: json.available_wei,
        balance: json.agent_balance,
        available: json.agent_available,
        buildCredits: json.build_credits
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch AGENT balance");
    } finally {
      setIsLoading(false);
    }
  }, [apiKey, baseUrl, tenantId]);
  react.useEffect(() => {
    fetchBalance();
    intervalRef.current = setInterval(fetchBalance, POLL_INTERVAL_MS2);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchBalance]);
  return { data, isLoading, error, refetch: fetchBalance };
}
var CONTRACTS = {
  "arbitrum-sepolia": {
    payment: "0x879101330bcB251CBB775559419cB6389346ee8c",
    token: "0xD31f5765F92D7D3fF0463eeaa14C157d423aF9E1"
  },
  "arbitrum": {
    payment: "0x879101330bcB251CBB775559419cB6389346ee8c",
    token: "0xD31f5765F92D7D3fF0463eeaa14C157d423aF9E1"
  }
};
var ERC20_APPROVE_ABI = [
  {
    name: "approve",
    type: "function",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable"
  }
];
var DEPOSIT_ABI = [
  {
    name: "deposit",
    type: "function",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable"
  }
];
function useDeposit(chain = "arbitrum-sepolia") {
  const wagmiConfig = wagmi.useConfig();
  const [isDepositing, setIsDepositing] = react.useState(false);
  const [txHash, setTxHash] = react.useState(null);
  const [error, setError] = react.useState(null);
  const contracts = CONTRACTS[chain] || CONTRACTS["arbitrum-sepolia"];
  const deposit = react.useCallback(async (inferAmount) => {
    setIsDepositing(true);
    setError(null);
    setTxHash(null);
    try {
      const { writeContract, waitForTransactionReceipt } = await import('@wagmi/core');
      const { parseUnits } = await import('viem');
      const amountWei = parseUnits(inferAmount.toString(), 18);
      const approveTx = await writeContract(wagmiConfig, {
        address: contracts.token,
        abi: ERC20_APPROVE_ABI,
        functionName: "approve",
        args: [contracts.payment, amountWei]
      });
      await waitForTransactionReceipt(wagmiConfig, { hash: approveTx });
      const depositTx = await writeContract(wagmiConfig, {
        address: contracts.payment,
        abi: DEPOSIT_ABI,
        functionName: "deposit",
        args: [amountWei]
      });
      await waitForTransactionReceipt(wagmiConfig, { hash: depositTx });
      setTxHash(depositTx);
      return depositTx;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Deposit failed";
      setError(msg);
      return null;
    } finally {
      setIsDepositing(false);
    }
  }, [contracts]);
  return { deposit, isDepositing, txHash, error };
}
function useBuyInfer(options = {}) {
  const [isBuying, setIsBuying] = react.useState(false);
  const [status, setStatus] = react.useState("idle");
  const [error, setError] = react.useState(null);
  const buy = react.useCallback((amount) => {
    if (!options.apiKey) {
      setError("On-ramp not configured. Set onRampConfig in FlowstackConfig.");
      return;
    }
    if (!options.walletAddress) {
      setError("No wallet address. Sign up first.");
      return;
    }
    setIsBuying(true);
    setStatus("pending");
    setError(null);
    const baseUrl = options.environment === "production" ? "https://buy.moonpay.com" : "https://buy-sandbox.moonpay.com";
    const params = new URLSearchParams({
      apiKey: options.apiKey,
      currencyCode: "infer_arbitrum",
      // MoonPay currency code for INFER on Arbitrum
      walletAddress: options.walletAddress,
      ...amount ? { baseCurrencyAmount: amount.toString() } : {},
      colorCode: "#d4a843",
      // Casino amber
      showWalletAddressForm: "false"
    });
    const widgetUrl = `${baseUrl}?${params.toString()}`;
    const popup = window.open(
      widgetUrl,
      "moonpay",
      "width=500,height=700,left=200,top=100"
    );
    if (!popup) {
      window.location.href = widgetUrl;
      return;
    }
    const pollInterval = setInterval(() => {
      if (popup.closed) {
        clearInterval(pollInterval);
        setIsBuying(false);
        setStatus("completed");
      }
    }, 1e3);
  }, [options]);
  return { buy, isBuying, status, error };
}
var POLL_INTERVAL_MS3 = 6e4;
function useAppAccess(siteId, opts) {
  const flowstack = useFlowstackOptional();
  const [hasAccess, setHasAccess] = react.useState(true);
  const [queriesUsed, setQueriesUsed] = react.useState(0);
  const [queriesRemaining, setQueriesRemaining] = react.useState(null);
  const [paymentMode, setPaymentMode] = react.useState(null);
  const [unlockPriceCents, setUnlockPriceCents] = react.useState(null);
  const [unlockPriceLabel, setUnlockPriceLabel] = react.useState(null);
  const [isLoading, setIsLoading] = react.useState(false);
  const [error, setError] = react.useState(null);
  const intervalRef = react.useRef(null);
  const baseUrl = flowstack?.config?.baseUrl || "https://sage-api.flowstack.fun";
  const apiKey = flowstack?.credentials?.apiKey;
  const fetchStatus = react.useCallback(async () => {
    if (!siteId || !apiKey) return;
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ site_id: siteId });
      if (opts?.builderTenantId) params.set("builder_tenant_id", opts.builderTenantId);
      const resp = await fetch(`${baseUrl}/billing/app-access/status?${params}`, {
        headers: { Authorization: `Bearer ${apiKey}` }
      });
      if (!resp.ok) {
        setHasAccess(true);
        return;
      }
      const data = await resp.json();
      setHasAccess(data.has_access ?? true);
      setQueriesUsed(data.queries_used ?? 0);
      setQueriesRemaining(data.queries_remaining ?? null);
      setPaymentMode(data.payment_mode ?? null);
      setUnlockPriceCents(data.unlock_price_cents ?? null);
      setUnlockPriceLabel(data.unlock_price_label ?? null);
    } catch (err) {
      setError(err.message || "Failed to check access status");
      setHasAccess(true);
    } finally {
      setIsLoading(false);
    }
  }, [siteId, apiKey, baseUrl, opts?.builderTenantId]);
  react.useEffect(() => {
    if (!siteId || !apiKey) return;
    fetchStatus();
    intervalRef.current = setInterval(fetchStatus, POLL_INTERVAL_MS3);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchStatus, siteId, apiKey]);
  const checkout = react.useCallback(
    async (checkoutOpts) => {
      if (!apiKey || !siteId) return;
      try {
        const successUrl = checkoutOpts?.successUrl || (typeof window !== "undefined" ? window.location.href : "");
        const cancelUrl = checkoutOpts?.cancelUrl || (typeof window !== "undefined" ? window.location.href : "");
        const resp = await fetch(`${baseUrl}/billing/app-access/checkout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            site_id: siteId,
            success_url: successUrl,
            cancel_url: cancelUrl
          })
        });
        if (!resp.ok) {
          const body = await resp.json().catch(() => ({}));
          throw new Error(body.detail || `Checkout failed: ${resp.status}`);
        }
        const data = await resp.json();
        if (data.url && typeof window !== "undefined") {
          window.location.href = data.url;
        }
      } catch (err) {
        setError(err.message || "Checkout failed");
      }
    },
    [apiKey, siteId, baseUrl]
  );
  return {
    hasAccess,
    queriesUsed,
    queriesRemaining,
    paymentMode,
    unlockPriceCents,
    unlockPriceLabel,
    isLoading,
    error,
    checkout,
    refetch: fetchStatus
  };
}
var WalletCtx = react.createContext({
  privyReady: false,
  baseUrl: "https://sage-api.flowstack.fun"
});
function WalletProvider({
  children,
  privyAppId,
  chain = "arbitrum",
  baseUrl = "https://sage-api.flowstack.fun",
  walletConnectProjectId
}) {
  const [queryClient] = react.useState(() => new reactQuery.QueryClient());
  const selectedChain = chain === "arbitrum-sepolia" ? chains.arbitrumSepolia : chains.arbitrum;
  const wagmiConfig = react.useMemo(() => {
    const config = wagmi$1.createConfig({
      chains: [selectedChain],
      transports: { [selectedChain.id]: wagmi.http() },
      // Explicit connectors so wagmi always has something to work with.
      // Without these, useConnect().connectors is empty → connectAsync({ connector: undefined })
      // → "undefined is not an object (evaluating 'n.uid')" crash.
      connectors: [
        wagmi.injected()
        // MetaMask, Rabby, Brave, any browser extension wallet
      ]
    });
    if (typeof window !== "undefined") {
      window.__wagmiConfig = config;
    }
    return config;
  }, [selectedChain]);
  if (!privyAppId) {
    return /* @__PURE__ */ jsxRuntime.jsx(WalletCtx.Provider, { value: { privyReady: false, baseUrl }, children: /* @__PURE__ */ jsxRuntime.jsx(reactQuery.QueryClientProvider, { client: queryClient, children }) });
  }
  return /* @__PURE__ */ jsxRuntime.jsx(
    reactAuth.PrivyProvider,
    {
      appId: privyAppId,
      config: {
        // Embedded signer — the EOA keypair that controls the smart wallet.
        // Must be created for all users so the smart wallet has a signer.
        // NOTE: @privy-io/react-auth v3 nests createOnLogin per chain
        // (embeddedWallets.ethereum.createOnLogin). The old v2 flat shape
        // (embeddedWallets.createOnLogin) is silently ignored on v3, so NO
        // wallet gets created on login — the user authenticates but has no
        // wallet/address. Use the v3 shape.
        embeddedWallets: {
          ethereum: {
            createOnLogin: "all-users"
          },
          showWalletUIs: false
        },
        // EVM smart wallet (ERC-4337) — Kernel/ZeroDev implementation.
        // Must be enabled in the Privy dashboard (Smart wallets → Kernel → Arbitrum).
        // The smart wallet address is what Privy returns as type='smart_wallet'
        // in linked_accounts, and is the canonical address for the token economy.
        // @ts-ignore — 'smart_wallets' may not be in older @privy-io/react-auth types
        smart_wallets: {
          type: "kernel"
        },
        loginMethods: ["email", "google", "apple", "twitter", "github", "linkedin", "spotify", "wallet"],
        appearance: { theme: "dark" },
        defaultChain: selectedChain,
        ...walletConnectProjectId ? { walletConnectCloudProjectId: walletConnectProjectId } : {}
      },
      children: /* @__PURE__ */ jsxRuntime.jsx(reactQuery.QueryClientProvider, { client: queryClient, children: /* @__PURE__ */ jsxRuntime.jsx(wagmi$1.WagmiProvider, { config: wagmiConfig, children: /* @__PURE__ */ jsxRuntime.jsx(WalletCtx.Provider, { value: { privyReady: true, baseUrl }, children }) }) })
    }
  );
}
function LoginButton({
  onSuccess,
  onError,
  showWalletOption = true,
  className
}) {
  const [mode, setMode] = react.useState("signup");
  const [isLoading, setIsLoading] = react.useState(false);
  const handlePrivyLogin = react.useCallback(async () => {
    setIsLoading(true);
    try {
      const { usePrivy } = await import('@privy-io/react-auth');
      onError?.("Use this component inside WalletProvider");
    } catch (e) {
      onError?.(e instanceof Error ? e.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  }, [onSuccess, onError]);
  const handleWalletConnect = react.useCallback(async () => {
    setIsLoading(true);
    try {
      onError?.("Wallet connect requires WalletProvider context");
    } catch (e) {
      onError?.(e instanceof Error ? e.message : "Wallet connect failed");
    } finally {
      setIsLoading(false);
    }
  }, [onError]);
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { className, children: [
    mode === "signup" ? /* @__PURE__ */ jsxRuntime.jsx(
      "button",
      {
        onClick: handlePrivyLogin,
        disabled: isLoading,
        style: {
          padding: "12px 24px",
          borderRadius: "8px",
          border: "none",
          backgroundColor: "#d4a843",
          color: "#0a0a0a",
          fontWeight: 600,
          cursor: isLoading ? "not-allowed" : "pointer",
          opacity: isLoading ? 0.7 : 1,
          width: "100%"
        },
        children: isLoading ? "Signing in..." : "Sign up with Google"
      }
    ) : /* @__PURE__ */ jsxRuntime.jsx(
      "button",
      {
        onClick: handleWalletConnect,
        disabled: isLoading,
        style: {
          padding: "12px 24px",
          borderRadius: "8px",
          border: "1px solid #c4bdb3",
          backgroundColor: "transparent",
          color: "#c4bdb3",
          fontWeight: 600,
          cursor: isLoading ? "not-allowed" : "pointer",
          opacity: isLoading ? 0.7 : 1,
          width: "100%"
        },
        children: isLoading ? "Connecting..." : "Connect Wallet"
      }
    ),
    showWalletOption && /* @__PURE__ */ jsxRuntime.jsx(
      "button",
      {
        onClick: () => setMode(mode === "signup" ? "wallet" : "signup"),
        style: {
          marginTop: "8px",
          padding: "8px",
          background: "none",
          border: "none",
          color: "#c4bdb3",
          fontSize: "13px",
          cursor: "pointer",
          width: "100%",
          textAlign: "center"
        },
        children: mode === "signup" ? "Already have INFER? Connect wallet" : "Sign up with email instead"
      }
    )
  ] });
}
function InferBalanceBadge({
  lowBalanceThreshold = 5,
  onBuyMore,
  className
}) {
  const { data, isLoading } = useInferBalance();
  if (isLoading && !data) {
    return /* @__PURE__ */ jsxRuntime.jsx("span", { className, style: { ...badgeStyle, opacity: 0.5 }, children: "..." });
  }
  if (!data) return null;
  const isLow = data.queryCredits <= lowBalanceThreshold;
  return /* @__PURE__ */ jsxRuntime.jsxs(
    "span",
    {
      className,
      style: {
        ...badgeStyle,
        backgroundColor: isLow ? "#3a1c1c" : "#1a1a1a",
        borderColor: isLow ? "#d44343" : "#333"
      },
      children: [
        /* @__PURE__ */ jsxRuntime.jsx("span", { style: { color: isLow ? "#d44343" : "#d4a843", fontWeight: 600 }, children: data.queryCredits }),
        /* @__PURE__ */ jsxRuntime.jsx("span", { style: { color: "#c4bdb3", marginLeft: "4px", fontSize: "12px" }, children: "queries" }),
        isLow && onBuyMore && /* @__PURE__ */ jsxRuntime.jsx(
          "button",
          {
            onClick: onBuyMore,
            style: {
              marginLeft: "8px",
              padding: "2px 8px",
              borderRadius: "4px",
              border: "1px solid #d4a843",
              backgroundColor: "transparent",
              color: "#d4a843",
              fontSize: "11px",
              cursor: "pointer"
            },
            children: "Buy More"
          }
        )
      ]
    }
  );
}
var badgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  padding: "4px 12px",
  borderRadius: "20px",
  border: "1px solid #333",
  fontSize: "13px",
  fontFamily: "var(--font-body, Inter, sans-serif)"
};
function AgentBalanceBadge({
  lowBalanceThreshold = 2,
  onBuyMore,
  className
}) {
  const { data, isLoading } = useAgentBalance();
  if (isLoading && !data) {
    return /* @__PURE__ */ jsxRuntime.jsx("span", { className, style: { ...badgeStyle2, opacity: 0.5 }, children: "..." });
  }
  if (!data) return null;
  const isLow = data.buildCredits <= lowBalanceThreshold;
  return /* @__PURE__ */ jsxRuntime.jsxs(
    "span",
    {
      className,
      style: {
        ...badgeStyle2,
        backgroundColor: isLow ? "#3a1c1c" : "#1a1a1a",
        borderColor: isLow ? "#d44343" : "#333"
      },
      children: [
        /* @__PURE__ */ jsxRuntime.jsx("span", { style: { color: isLow ? "#d44343" : "#43d4a8", fontWeight: 600 }, children: data.buildCredits }),
        /* @__PURE__ */ jsxRuntime.jsx("span", { style: { color: "#c4bdb3", marginLeft: "4px", fontSize: "12px" }, children: "builds" }),
        isLow && onBuyMore && /* @__PURE__ */ jsxRuntime.jsx(
          "button",
          {
            onClick: onBuyMore,
            style: {
              marginLeft: "8px",
              padding: "2px 8px",
              borderRadius: "4px",
              border: "1px solid #43d4a8",
              backgroundColor: "transparent",
              color: "#43d4a8",
              fontSize: "11px",
              cursor: "pointer"
            },
            children: "Buy More"
          }
        )
      ]
    }
  );
}
var badgeStyle2 = {
  display: "inline-flex",
  alignItems: "center",
  padding: "4px 12px",
  borderRadius: "20px",
  border: "1px solid #333",
  fontSize: "13px",
  fontFamily: "var(--font-body, Inter, sans-serif)"
};
var DEFAULT_OIF_BASE = "https://openinferencefoundation.org";
function NeedsAgent({
  amountNeeded,
  onProceed,
  returnUrl,
  children,
  oifBaseUrl = DEFAULT_OIF_BASE
}) {
  const { data, isLoading } = useAgentBalance();
  const available = data?.available ?? 0;
  const hasSufficient = available >= amountNeeded;
  const handleGetAgent = () => {
    const base = oifBaseUrl.replace(/\/$/, "");
    const returnTo = returnUrl ?? (typeof window !== "undefined" ? window.location.href : "");
    const url = `${base}/buy?returnTo=${encodeURIComponent(returnTo)}&need=${amountNeeded}`;
    if (typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };
  if (isLoading) {
    return /* @__PURE__ */ jsxRuntime.jsx("div", { style: { opacity: 0.6, pointerEvents: "none" }, children });
  }
  if (hasSufficient) {
    return /* @__PURE__ */ jsxRuntime.jsx("div", { onClick: onProceed, style: { cursor: "pointer" }, children });
  }
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { children: [
    children && /* @__PURE__ */ jsxRuntime.jsx("div", { style: { opacity: 0.5, pointerEvents: "none" }, children }),
    /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6 }, children: [
      /* @__PURE__ */ jsxRuntime.jsxs("p", { style: { margin: 0, fontSize: "0.85em", color: "#888" }, children: [
        "You need ",
        amountNeeded,
        " AGENT to use this feature.",
        data !== null && ` You have ${available.toFixed(2)}.`
      ] }),
      /* @__PURE__ */ jsxRuntime.jsx(
        "button",
        {
          onClick: handleGetAgent,
          style: {
            background: "#6366f1",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            padding: "6px 14px",
            fontSize: "0.875em",
            fontWeight: 600,
            cursor: "pointer"
          },
          children: "Get AGENT \u2192"
        }
      )
    ] })
  ] });
}
function PaymentRequired({
  queryCredits = 0,
  inferPerQuery = 50,
  onBuy,
  onDismiss,
  className
}) {
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { className, style: containerStyle, children: [
    /* @__PURE__ */ jsxRuntime.jsx("div", { style: { fontSize: "24px", marginBottom: "8px" }, children: "0 queries remaining" }),
    /* @__PURE__ */ jsxRuntime.jsxs("p", { style: { color: "#c4bdb3", marginBottom: "16px", lineHeight: 1.5 }, children: [
      "Each query costs ",
      inferPerQuery,
      " INFER. Buy more to continue using Casino."
    ] }),
    /* @__PURE__ */ jsxRuntime.jsx("button", { onClick: onBuy, style: buyButtonStyle, children: "Buy INFER" }),
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: { color: "#666", fontSize: "12px", marginTop: "12px" }, children: "Pay with credit card. No crypto knowledge needed." }),
    onDismiss && /* @__PURE__ */ jsxRuntime.jsx("button", { onClick: onDismiss, style: dismissStyle, children: "Maybe later" })
  ] });
}
var containerStyle = {
  textAlign: "center",
  padding: "32px 24px",
  backgroundColor: "#111111",
  borderRadius: "12px",
  border: "1px solid #333",
  maxWidth: "400px",
  margin: "0 auto",
  fontFamily: "var(--font-body, Inter, sans-serif)",
  color: "#f5f0e8"
};
var buyButtonStyle = {
  padding: "14px 32px",
  borderRadius: "8px",
  border: "none",
  backgroundColor: "#d4a843",
  color: "#0a0a0a",
  fontWeight: 700,
  fontSize: "16px",
  cursor: "pointer",
  width: "100%"
};
var dismissStyle = {
  marginTop: "8px",
  padding: "8px",
  background: "none",
  border: "none",
  color: "#666",
  fontSize: "13px",
  cursor: "pointer"
};
var TIERS = [
  { queries: 100, infer: 5e3, price: 5 },
  { queries: 500, infer: 25e3, price: 25 },
  { queries: 2e3, infer: 1e5, price: 95 }
];
function BuyInferModal({
  isOpen,
  onClose,
  apiKey,
  environment = "sandbox",
  walletAddress,
  inferPerQuery = 50,
  className
}) {
  const { buy, isBuying, status } = useBuyInfer({
    apiKey,
    environment,
    walletAddress
  });
  const [selectedTier, setSelectedTier] = react.useState(1);
  if (!isOpen) return null;
  return /* @__PURE__ */ jsxRuntime.jsx("div", { style: overlayStyle, onClick: onClose, children: /* @__PURE__ */ jsxRuntime.jsxs(
    "div",
    {
      className,
      style: modalStyle,
      onClick: (e) => e.stopPropagation(),
      children: [
        /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }, children: [
          /* @__PURE__ */ jsxRuntime.jsx("h2", { style: { margin: 0, fontSize: "20px", color: "#f5f0e8" }, children: "Buy Query Credits" }),
          /* @__PURE__ */ jsxRuntime.jsx("button", { onClick: onClose, style: closeStyle, children: "\xD7" })
        ] }),
        /* @__PURE__ */ jsxRuntime.jsx("div", { style: { display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }, children: TIERS.map((tier, i) => /* @__PURE__ */ jsxRuntime.jsxs(
          "button",
          {
            onClick: () => setSelectedTier(i),
            style: {
              ...tierStyle,
              borderColor: selectedTier === i ? "#d4a843" : "#333",
              backgroundColor: selectedTier === i ? "#1a1a0a" : "#1a1a1a"
            },
            children: [
              /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { fontWeight: 600, fontSize: "16px", color: "#f5f0e8" }, children: [
                tier.queries,
                " queries"
              ] }),
              /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { color: "#d4a843", fontWeight: 700, fontSize: "18px" }, children: [
                "$",
                tier.price
              ] })
            ]
          },
          tier.queries
        )) }),
        /* @__PURE__ */ jsxRuntime.jsx(
          "button",
          {
            onClick: () => buy(TIERS[selectedTier].price),
            disabled: isBuying,
            style: {
              ...buyStyle,
              opacity: isBuying ? 0.7 : 1,
              cursor: isBuying ? "not-allowed" : "pointer"
            },
            children: isBuying ? "Processing..." : `Buy ${TIERS[selectedTier].queries} queries \u2014 $${TIERS[selectedTier].price}`
          }
        ),
        /* @__PURE__ */ jsxRuntime.jsx("p", { style: { color: "#666", fontSize: "12px", textAlign: "center", marginTop: "12px" }, children: "Powered by MoonPay. Visa, Mastercard, Apple Pay accepted." })
      ]
    }
  ) });
}
var overlayStyle = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(0, 0, 0, 0.7)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999
};
var modalStyle = {
  backgroundColor: "#111111",
  borderRadius: "16px",
  border: "1px solid #333",
  padding: "24px",
  width: "100%",
  maxWidth: "420px",
  fontFamily: "var(--font-body, Inter, sans-serif)"
};
var closeStyle = {
  background: "none",
  border: "none",
  color: "#666",
  fontSize: "24px",
  cursor: "pointer",
  padding: "4px 8px"
};
var tierStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "16px 20px",
  borderRadius: "12px",
  border: "1px solid #333",
  cursor: "pointer",
  transition: "border-color 0.15s"
};
var buyStyle = {
  padding: "14px 32px",
  borderRadius: "8px",
  border: "none",
  backgroundColor: "#d4a843",
  color: "#0a0a0a",
  fontWeight: 700,
  fontSize: "16px",
  width: "100%"
};
function AppPaywall({ siteId, builderTenantId, children, onBlocked }) {
  const {
    hasAccess,
    queriesRemaining,
    paymentMode,
    unlockPriceCents,
    unlockPriceLabel,
    isLoading,
    checkout
  } = useAppAccess(siteId, { builderTenantId });
  const [serverBlocked, setServerBlocked] = react.useState(false);
  const [serverBlockReason, setServerBlockReason] = react.useState(null);
  react.useEffect(() => {
    function handlePaywall(e) {
      const detail = e.detail;
      if (!detail) return;
      if (detail.site_id && detail.site_id !== siteId) return;
      setServerBlocked(true);
      setServerBlockReason(detail.code || "payment_required");
      onBlocked?.(detail.code || "payment_required");
    }
    window.addEventListener("flowstack:app_paywall", handlePaywall);
    return () => window.removeEventListener("flowstack:app_paywall", handlePaywall);
  }, [siteId, onBlocked]);
  const showPaywall = serverBlocked || !isLoading && !hasAccess;
  if (!showPaywall) {
    return /* @__PURE__ */ jsxRuntime.jsx(jsxRuntime.Fragment, { children });
  }
  const reason = serverBlockReason || (queriesRemaining === 0 ? "free_tier_exhausted" : "payment_required");
  const priceLabel = unlockPriceLabel || (unlockPriceCents ? `$${(unlockPriceCents / 100).toFixed(2)}` : "Unlock app");
  const showAgentOption = paymentMode === "agent" || paymentMode === "both";
  return /* @__PURE__ */ jsxRuntime.jsx(
    "div",
    {
      style: {
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(4px)"
      },
      children: /* @__PURE__ */ jsxRuntime.jsxs(
        "div",
        {
          style: {
            background: "#111",
            border: "1px solid #333",
            borderRadius: "12px",
            padding: "32px",
            maxWidth: "360px",
            width: "90vw",
            textAlign: "center",
            color: "#fff"
          },
          children: [
            /* @__PURE__ */ jsxRuntime.jsx(
              "p",
              {
                style: {
                  fontSize: "10px",
                  letterSpacing: "0.3em",
                  textTransform: "uppercase",
                  color: "#888",
                  marginBottom: "12px"
                },
                children: reason === "free_tier_exhausted" ? "Free queries used" : "Access required"
              }
            ),
            reason === "free_tier_exhausted" && /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontSize: "13px", color: "#aaa", marginBottom: "20px" }, children: "You've used your free queries for this month. Unlock unlimited access below." }),
            reason === "payment_required" && /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontSize: "13px", color: "#aaa", marginBottom: "20px" }, children: "This app requires payment to access." }),
            /* @__PURE__ */ jsxRuntime.jsx(
              "button",
              {
                onClick: () => checkout(),
                style: {
                  width: "100%",
                  padding: "12px 24px",
                  background: "#6366f1",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  marginBottom: showAgentOption ? "8px" : "0"
                },
                children: priceLabel
              }
            ),
            showAgentOption && /* @__PURE__ */ jsxRuntime.jsx(
              "p",
              {
                style: {
                  fontSize: "11px",
                  color: "#666",
                  cursor: "pointer",
                  textDecoration: "underline"
                },
                onClick: () => {
                  if (typeof window !== "undefined") {
                    window.open(`https://openinferencefoundation.org/buy?returnTo=${encodeURIComponent(window.location.href)}`, "_blank");
                  }
                },
                children: "Or pay with AGENT tokens"
              }
            )
          ]
        }
      )
    }
  );
}

exports.AgentBalanceBadge = AgentBalanceBadge;
exports.AppPaywall = AppPaywall;
exports.BuyInferModal = BuyInferModal;
exports.InferBalanceBadge = InferBalanceBadge;
exports.LoginButton = LoginButton;
exports.NeedsAgent = NeedsAgent;
exports.PaymentRequired = PaymentRequired;
exports.WalletProvider = WalletProvider;
exports.useAgentBalance = useAgentBalance;
exports.useAppAccess = useAppAccess;
exports.useBuyInfer = useBuyInfer;
exports.useDeposit = useDeposit;
exports.useInferBalance = useInferBalance;
exports.useWalletAuth = useWalletAuth;
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map