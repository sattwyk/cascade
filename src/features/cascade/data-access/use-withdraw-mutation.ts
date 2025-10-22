import { useMutation } from '@tanstack/react-query';
import { UiWalletAccount, useWalletUiSigner } from '@wallet-ui/react';
import { useWalletUiSignAndSend } from '@wallet-ui/react-gill';
import type { Address } from 'gill';
import { toast } from 'sonner';

import { getWithdrawInstruction } from '@project/anchor';

import { toastTx } from '@/components/toast-tx';

import { derivePaymentStream, deriveVault, getErrorMessage, toBigInt } from './derive-cascade-pdas';
import { useInvalidatePaymentStreamQuery } from './use-invalidate-payment-stream-query';

export type WithdrawInput = {
  employer: Address;
  employeeTokenAccount: Address;
  amount: number | bigint;
  employee?: Address;
  stream?: Address;
  vault?: Address;
};

export function useWithdrawMutation({ account }: { account: UiWalletAccount }) {
  const signer = useWalletUiSigner({ account });
  const signAndSend = useWalletUiSignAndSend();
  const invalidatePaymentStreamQuery = useInvalidatePaymentStreamQuery();

  return useMutation({
    mutationFn: async (input: WithdrawInput) => {
      const employeeAddress = input.employee ?? account.address;
      const streamAddress = input.stream ?? (await derivePaymentStream(input.employer, employeeAddress))[0];
      const vaultAddress = input.vault ?? (await deriveVault(streamAddress))[0];

      const instruction = getWithdrawInstruction({
        employee: signer,
        stream: streamAddress,
        vault: vaultAddress,
        employeeTokenAccount: input.employeeTokenAccount,
        amount: toBigInt(input.amount),
      });

      return await signAndSend(instruction, signer);
    },
    onSuccess: async (signature) => {
      toastTx(signature, 'Withdrawal completed');
      // Wait for transaction confirmation before invalidating cache
      setTimeout(() => {
        invalidatePaymentStreamQuery();
      }, 1500);
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error));
    },
  });
}
