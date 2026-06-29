/**
 * useDeposit — approve + deposit INFER tokens into InferencePayment contract.
 *
 * For crypto-native users who already have INFER tokens.
 * Handles the two-step ERC-20 flow: approve → deposit.
 */

import { useState, useCallback } from 'react';
import { useConfig } from 'wagmi';
import type { UseDepositReturn } from './types';

// InferencePayment contract addresses by chain
const CONTRACTS: Record<string, { payment: string; token: string }> = {
  'arbitrum-sepolia': {
    payment: '0x879101330bcB251CBB775559419cB6389346ee8c',
    token: '0xD31f5765F92D7D3fF0463eeaa14C157d423aF9E1',
  },
  'arbitrum': {
    payment: '0x879101330bcB251CBB775559419cB6389346ee8c',
    token: '0xD31f5765F92D7D3fF0463eeaa14C157d423aF9E1',
  },
};

const ERC20_APPROVE_ABI = [
  {
    name: 'approve',
    type: 'function',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
] as const;

const DEPOSIT_ABI = [
  {
    name: 'deposit',
    type: 'function',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const;

export function useDeposit(chain: string = 'arbitrum-sepolia'): UseDepositReturn {
  const wagmiConfig = useConfig();
  const [isDepositing, setIsDepositing] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const contracts = CONTRACTS[chain] || CONTRACTS['arbitrum-sepolia'];

  const deposit = useCallback(async (inferAmount: number): Promise<string | null> => {
    setIsDepositing(true);
    setError(null);
    setTxHash(null);

    try {
      // Dynamic import viem + wagmi
      const { writeContract, waitForTransactionReceipt } = await import('@wagmi/core');
      const { parseUnits } = await import('viem');

      const amountWei = parseUnits(inferAmount.toString(), 18);

      // Step 1: Approve InferencePayment to spend INFER
      const approveTx = await writeContract(wagmiConfig, {
        address: contracts.token as `0x${string}`,
        abi: ERC20_APPROVE_ABI,
        functionName: 'approve',
        args: [contracts.payment as `0x${string}`, amountWei],
      });

      await waitForTransactionReceipt(wagmiConfig, { hash: approveTx });

      // Step 2: Deposit into InferencePayment
      const depositTx = await writeContract(wagmiConfig, {
        address: contracts.payment as `0x${string}`,
        abi: DEPOSIT_ABI,
        functionName: 'deposit',
        args: [amountWei],
      });

      await waitForTransactionReceipt(wagmiConfig, { hash: depositTx });

      setTxHash(depositTx);
      return depositTx;

    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Deposit failed';
      setError(msg);
      return null;
    } finally {
      setIsDepositing(false);
    }
  }, [contracts]);

  return { deposit, isDepositing, txHash, error };
}
