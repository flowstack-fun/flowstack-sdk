import { U as UseWalletAuthReturn, a as UseInferBalanceReturn, b as UseAgentBalanceReturn, c as UseDepositReturn, d as UseBuyInferReturn, e as UseAppAccessReturn, W as WalletProviderProps, N as NeedsAgentProps, A as AppPaywallProps } from '../types-BmCPwbGH.mjs';
export { g as AgentBalance, h as AppAccessStatus, I as InferBalance, f as WalletAuthState } from '../types-BmCPwbGH.mjs';
import * as react_jsx_runtime from 'react/jsx-runtime';
import { createConfig } from '@privy-io/wagmi';
import React from 'react';

/**
 * useWalletAuth — handles both Privy (embedded) and SIWE (external) auth paths.
 *
 * Both paths produce the same result: a JWT with a wallet_address claim
 * stored via the existing FlowstackProvider credential flow.
 */

declare function useWalletAuth(): UseWalletAuthReturn;

/**
 * useInferBalance — polls the backend for INFER token balance.
 *
 * Uses GET /billing/infer/balance which reads on-chain balance
 * and subtracts active holds.
 */

declare function useInferBalance(): UseInferBalanceReturn;

/**
 * useAgentBalance — polls the backend for AGENT token balance.
 *
 * Uses GET /billing/agent/balance which reads on-chain AGENT balance
 * from the AgentPayment contract and subtracts active holds.
 */

declare function useAgentBalance(): UseAgentBalanceReturn;

/**
 * useDeposit — approve + deposit INFER tokens into InferencePayment contract.
 *
 * For crypto-native users who already have INFER tokens.
 * Handles the two-step ERC-20 flow: approve → deposit.
 */

declare function useDeposit(chain?: string): UseDepositReturn;

/**
 * useBuyInfer — opens fiat on-ramp widget (MoonPay/Transak).
 *
 * Handles: credit card → INFER → auto-deposit. User never touches crypto.
 * The on-ramp provider delivers INFER to the user's embedded wallet,
 * then the SDK auto-deposits into InferencePayment.
 */

interface BuyInferOptions {
    /** MoonPay or Transak API key */
    apiKey?: string;
    /** sandbox or production */
    environment?: 'sandbox' | 'production';
    /** Wallet address to receive INFER */
    walletAddress?: string;
}
declare function useBuyInfer(options?: BuyInferOptions): UseBuyInferReturn;

/**
 * useAppAccess — checks whether the authenticated end-user has access to a
 * monetized built app, and provides a checkout function to unlock it.
 *
 * Polls GET /billing/app-access/status every 60 seconds.
 * On `checkout()` call, opens a Stripe Checkout session for one-time purchase.
 *
 * Usage:
 *   const { hasAccess, queriesRemaining, checkout } = useAppAccess(config.appScope);
 *   if (!hasAccess) return <AppPaywall siteId={config.appScope} ... />;
 */

declare function useAppAccess(siteId: string, opts?: {
    builderTenantId?: string;
}): UseAppAccessReturn;

declare global {
    interface Window {
        __wagmiConfig?: ReturnType<typeof createConfig>;
    }
}
declare function WalletProvider({ children, privyAppId, chain, baseUrl, walletConnectProjectId, }: WalletProviderProps): react_jsx_runtime.JSX.Element;

/**
 * LoginButton — "Sign up with Google" / "Connect Wallet" toggle.
 *
 * Default: Privy (email/Google) signup. Toggle to external wallet (MetaMask).
 */
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
declare function LoginButton({ onSuccess, onError, showWalletOption, className, }: LoginButtonProps): react_jsx_runtime.JSX.Element;

/**
 * InferBalanceBadge — shows INFER balance in a compact badge.
 *
 * Displays query credits remaining. Shows "Buy More" when low.
 */
interface InferBalanceBadgeProps {
    /** Threshold to show "Buy More" warning */
    lowBalanceThreshold?: number;
    /** Callback when "Buy More" is clicked */
    onBuyMore?: () => void;
    /** CSS class name */
    className?: string;
}
declare function InferBalanceBadge({ lowBalanceThreshold, onBuyMore, className, }: InferBalanceBadgeProps): react_jsx_runtime.JSX.Element | null;

/**
 * AgentBalanceBadge — shows AGENT token balance in a compact badge.
 *
 * Displays build credits remaining. Shows "Buy More" when low.
 */
interface AgentBalanceBadgeProps {
    /** Threshold to show "Buy More" warning */
    lowBalanceThreshold?: number;
    /** Callback when "Buy More" is clicked */
    onBuyMore?: () => void;
    /** CSS class name */
    className?: string;
}
declare function AgentBalanceBadge({ lowBalanceThreshold, onBuyMore, className, }: AgentBalanceBadgeProps): react_jsx_runtime.JSX.Element | null;

/**
 * NeedsAgent — gating component for AGENT-token-gated features in built apps.
 *
 * Checks the user's AGENT balance. If sufficient, renders children and calls
 * onProceed when the user activates the gated action. If insufficient, renders
 * a "Get AGENT" CTA that deep-links to the OIF /buy page with returnTo + need
 * params so the user lands back in the app after purchasing.
 *
 * Usage:
 *   <NeedsAgent amountNeeded={2} onProceed={generateAlbumArt} returnUrl={window.location.href}>
 *     <p>Generate a new design for 2 AGENT</p>
 *   </NeedsAgent>
 *
 * The user never sees a seed phrase — Privy handles wallet creation on OIF.
 * No auth setup required in the built app: the component works for anonymous users
 * (balance will read 0) and authenticated wallet users alike.
 */

declare function NeedsAgent({ amountNeeded, onProceed, returnUrl, children, oifBaseUrl, }: NeedsAgentProps): React.ReactElement;

/**
 * PaymentRequired — shown when user's INFER balance is insufficient (402).
 *
 * Displays current balance and a "Buy INFER" CTA.
 */
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
declare function PaymentRequired({ queryCredits, inferPerQuery, onBuy, onDismiss, className, }: PaymentRequiredProps): react_jsx_runtime.JSX.Element;

/**
 * BuyInferModal — fiat on-ramp widget for purchasing INFER with a credit card.
 *
 * Wraps MoonPay/Transak with Casino-branded pricing tiers.
 */
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
declare function BuyInferModal({ isOpen, onClose, apiKey, environment, walletAddress, inferPerQuery, className, }: BuyInferModalProps): react_jsx_runtime.JSX.Element | null;

declare function AppPaywall({ siteId, builderTenantId, children, onBlocked }: AppPaywallProps): react_jsx_runtime.JSX.Element;

export { AgentBalanceBadge, AppPaywall, AppPaywallProps, BuyInferModal, InferBalanceBadge, LoginButton, NeedsAgent, NeedsAgentProps, PaymentRequired, UseAgentBalanceReturn, UseAppAccessReturn, UseBuyInferReturn, UseDepositReturn, UseInferBalanceReturn, UseWalletAuthReturn, WalletProvider, WalletProviderProps, useAgentBalance, useAppAccess, useBuyInfer, useDeposit, useInferBalance, useWalletAuth };
