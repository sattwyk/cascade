import { useMutation } from '@tanstack/react-query';
import { UiWalletAccount, useWalletUiSigner } from '@wallet-ui/react';
import { useWalletUiSignAndSend } from '@wallet-ui/react-gill';
import type { Address } from 'gill';
import { toast } from 'sonner';

import { getCreateStreamInstructionAsync } from '@project/anchor';

import { toastTx } from '@/components/toast-tx';
import { useInvalidateDashboardStreamsQuery } from '@/features/dashboard/data-access/use-invalidate-dashboard-streams-query';

import { getErrorMessage, toBigInt } from './derive-cascade-pdas';
import { useInvalidatePaymentStreamQuery } from './use-invalidate-payment-stream-query';

export type CreateStreamInput = {
  employee: Address;
  mint: Address;
  employerTokenAccount: Address;
  hourlyRate: number | bigint;
  totalDeposit: number | bigint;
};

export function useCreateStreamMutation({ account }: { account: UiWalletAccount }) {
  const signer = useWalletUiSigner({ account });
  const signAndSend = useWalletUiSignAndSend();
  const invalidatePaymentStreamQuery = useInvalidatePaymentStreamQuery();
  const invalidateDashboardStreamsQuery = useInvalidateDashboardStreamsQuery();

  return useMutation({
    mutationFn: async (input: CreateStreamInput) => {
      const instruction = await getCreateStreamInstructionAsync({
        employer: signer,
        employee: input.employee,
        mint: input.mint,
        employerTokenAccount: input.employerTokenAccount,
        hourlyRate: toBigInt(input.hourlyRate),
        totalDeposit: toBigInt(input.totalDeposit),
      });

      return await signAndSend(instruction, signer);
    },
    onSuccess: async (signature) => {
      toastTx(signature, 'Stream created');
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
