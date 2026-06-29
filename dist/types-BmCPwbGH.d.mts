/**
 * Types for the wallet module (flowstack-sdk/wallet).
 */
interface WalletAuthState {
    /** Whether a wallet is connected and authenticated */
    isConnected: boolean;
    /** Loading state during auth */
    isLoading: boolean;
    /** Connected wallet address (checksummed) */
    address: string | null;
    /** Whether this is a Privy embedded wallet (vs MetaMask) */
    isEmbeddedWallet: boolean;
    /** Auth method used */
    authMethod: 'privy' | 'siwe' | null;
    /** Error message if auth failed */
    error: string | null;
}
interface UseWalletAuthReturn extends WalletAuthState {
    /** Login via Privy (email/Google) or external wallet (MetaMask) */
    login: (method?: 'privy' | 'wallet') => Promise<void>;
    /** Disconnect wallet and clear session */
    logout: () => void;
}
interface InferBalance {
    /** Raw on-chain balance in wei */
    balanceWei: string;
    /** Held amount in wei (pending query charges) */
    heldWei: string;
    /** Available balance in wei (balance - held) */
    availableWei: string;
    /** Human-readable INFER token balance */
    balance: number;
    /** Human-readable available balance */
    available: number;
    /** Number of queries this balance can cover */
    queryCredits: number;
}
interface UseInferBalanceReturn {
    /** Current balance data (null if not loaded) */
    data: InferBalance | null;
    /** Whether balance is being fetched */
    isLoading: boolean;
    /** Error message */
    error: string | null;
    /** Manually refresh balance */
    refetch: () => Promise<void>;
}
interface UseDepositReturn {
    /** Execute approve + deposit flow */
    deposit: (amount: number) => Promise<string | null>;
    /** Whether deposit is in progress */
    isDepositing: boolean;
    /** Transaction hash of last deposit */
    txHash: string | null;
    /** Error message */
    error: string | null;
}
interface UseBuyInferReturn {
    /** Open fiat on-ramp widget */
    buy: (amount?: number) => void;
    /** Whether purchase flow is active */
    isBuying: boolean;
    /** Purchase status */
    status: 'idle' | 'pending' | 'completed' | 'failed';
    /** Error message */
    error: string | null;
}
interface AgentBalance {
    /** Raw on-chain AGENT balance in wei */
    balanceWei: string;
    /** Held amount in wei (active query charges) */
    heldWei: string;
    /** Available balance in wei (balance - held) */
    availableWei: string;
    /** Human-readable AGENT token balance */
    balance: number;
    /** Human-readable available AGENT balance */
    available: number;
    /** Number of build credits equivalent */
    buildCredits: number;
}
interface UseAgentBalanceReturn {
    /** Current AGENT balance data (null if not loaded or no wallet) */
    data: AgentBalance | null;
    /** Whether balance is being fetched */
    isLoading: boolean;
    /** Error message */
    error: string | null;
    /** Manually refresh balance */
    refetch: () => Promise<void>;
}
interface NeedsAgentProps {
    /** Minimum AGENT balance required to proceed */
    amountNeeded: number;
    /** Called when balance is sufficient and user clicks the gated action */
    onProceed: () => void;
    /** Current page URL to return to after OIF purchase (defaults to window.location.href) */
    returnUrl?: string;
    /** Content to show when user has sufficient AGENT */
    children?: React.ReactNode;
    /** OIF base URL (default: 'https://openinferencefoundation.org') */
    oifBaseUrl?: string;
}
interface AppAccessStatus {
    /** Whether the end-user has access to this built app */
    hasAccess: boolean;
    /** Number of free queries used this month */
    queriesUsed: number;
    /** Remaining free queries this month (null = unlimited — paid access) */
    queriesRemaining: number | null;
    /** Payment mode configured by the builder */
    paymentMode: 'stripe' | 'agent' | 'both' | null;
    /** One-time unlock price in USD cents (null = free or not configured) */
    unlockPriceCents: number | null;
    /** Human-readable unlock price label */
    unlockPriceLabel: string | null;
}
interface UseAppAccessReturn extends AppAccessStatus {
    /** Whether the access check is being fetched */
    isLoading: boolean;
    /** Error message if the status check failed */
    error: string | null;
    /** Open Stripe Checkout to unlock this app */
    checkout: (opts?: {
        successUrl?: string;
        cancelUrl?: string;
    }) => Promise<void>;
    /** Manually refresh the access status */
    refetch: () => Promise<void>;
}
interface AppPaywallProps {
    /** Site ID of the built app (typically config.appScope) */
    siteId: string;
    /** Builder's tenant ID — needed to load app config */
    builderTenantId?: string;
    /** Content to show when the user has access */
    children: React.ReactNode;
    /** Called when the backend returns an app_paywall SSE event */
    onBlocked?: (reason: string) => void;
}
interface WalletProviderProps {
    children: React.ReactNode;
    /** Privy app ID (enables embedded wallet flow) */
    privyAppId?: string;
    /** Chain to use */
    chain?: 'arbitrum-sepolia' | 'arbitrum';
    /** Casino API base URL */
    baseUrl?: string;
    /** WalletConnect v2 Cloud project ID — enables the WalletConnect connector in Privy's login modal */
    walletConnectProjectId?: string;
}

export type { AppPaywallProps as A, InferBalance as I, NeedsAgentProps as N, UseWalletAuthReturn as U, WalletProviderProps as W, UseInferBalanceReturn as a, UseAgentBalanceReturn as b, UseDepositReturn as c, UseBuyInferReturn as d, UseAppAccessReturn as e, WalletAuthState as f, AgentBalance as g, AppAccessStatus as h };
