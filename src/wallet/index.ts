/**
 * flowstack-sdk/wallet — INFER token wallet integration.
 *
 * Separate entry point from flowstack-sdk to avoid bundling
 * Privy/wagmi/viem for consumers who don't need wallet features.
 *
 * Usage:
 *   import { useWalletAuth, useInferBalance, LoginButton } from 'flowstack-sdk/wallet';
 */

// Hooks
export { useWalletAuth } from './useWalletAuth';
export { useInferBalance } from './useInferBalance';
export { useAgentBalance } from './useAgentBalance';
export { useDeposit } from './useDeposit';
export { useBuyInfer } from './useBuyInfer';
export { useAppAccess } from './useAppAccess';

// Provider
export { WalletProvider } from './WalletProvider';

// Components
export { LoginButton } from './LoginButton';
export { InferBalanceBadge } from './InferBalanceBadge';
export { AgentBalanceBadge } from './AgentBalanceBadge';
export { NeedsAgent } from './NeedsAgent';
export { PaymentRequired } from './PaymentRequired';
export { BuyInferModal } from './BuyInferModal';
export { AppPaywall } from './AppPaywall';

// Types
export type {
  WalletAuthState,
  UseWalletAuthReturn,
  InferBalance,
  UseInferBalanceReturn,
  AgentBalance,
  UseAgentBalanceReturn,
  NeedsAgentProps,
  UseDepositReturn,
  UseBuyInferReturn,
  WalletProviderProps,
  AppAccessStatus,
  UseAppAccessReturn,
  AppPaywallProps,
} from './types';
