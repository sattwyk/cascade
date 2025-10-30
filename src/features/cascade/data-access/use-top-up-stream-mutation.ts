import { useMutation } from '@tanstack/react-query';
import { UiWalletAccount, useWalletUiSigner } from '@wallet-ui/react';
import { useWalletUiSignAndSend } from '@wallet-ui/react-gill';
import type { Address } from 'gill';
import { toast } from 'sonner';

import { getTopUpStreamInstruction } from '@project/anchor';

import { toastTx } from '@/components/toast-tx';
import { useInvalidateDashboardStreamsQuery } from '@/features/dashboard/data-access/use-invalidate-dashboard-streams-query';

import { derivePaymentStream, deriveVault, getErrorMessage, toBigInt } from './derive-cascade-pdas';
import { useInvalidatePaymentStreamQuery } from './use-invalidate-payment-stream-query';

export type TopUpStreamInput = {
  employee: Address;
  employerTokenAccount: Address;
  additionalAmount: number | bigint;
  stream?: Address;
  vault?: Address;
};

export function useTopUpStreamMutation({ account }: { account: UiWalletAccount }) {
  const signer = useWalletUiSigner({ account });
  const signAndSend = useWalletUiSignAndSend();
  const invalidatePaymentStreamQuery = useInvalidatePaymentStreamQuery();
  const invalidateDashboardStreamsQuery = useInvalidateDashboardStreamsQuery();

  return useMutation({
    mutationFn: async (input: TopUpStreamInput) => {
      const employerAddress = account.address;
      const streamAddress = input.stream ?? (await derivePaymentStream(employerAddress, input.employee))[0];
      const vaultAddress = input.vault ?? (await deriveVault(streamAddress))[0];

      const instruction = getTopUpStreamInstruction({
        employer: signer,
        stream: streamAddress,
        vault: vaultAddress,
        employerTokenAccount: input.employerTokenAccount,
        additionalAmount: toBigInt(input.additionalAmount),
      });

      return await signAndSend(instruction, signer);
    },
    onSuccess: async (signature) => {
      toastTx(signature, 'Stream funded');
      // Wait for transaction confirmation before invalidating cache
      setTimeout(() => {
        invalidatePaymentStreamQuery();
        invalidateDashboardStreamsQuery();
      }, 1500);
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error));
    },
  });
}
