import { useMutation } from '@tanstack/react-query';
import { UiWalletAccount, useWalletUiSigner } from '@wallet-ui/react';
import { useWalletUiSignAndSend } from '@wallet-ui/react-gill';
import type { Address } from 'gill';
import { toast } from 'sonner';

import { getCloseStreamInstructionAsync } from '@project/anchor';

import { toastTx } from '@/components/toast-tx';
import { useInvalidateDashboardStreamsQuery } from '@/features/dashboard/data-access/use-invalidate-dashboard-streams-query';

import { derivePaymentStream, getErrorMessage } from './derive-cascade-pdas';
import { useInvalidatePaymentStreamQuery } from './use-invalidate-payment-stream-query';

export type CloseStreamInput = {
  employee: Address;
  stream?: Address;
  vault?: Address;
};

export function useCloseStreamMutation({ account }: { account: UiWalletAccount }) {
  const signer = useWalletUiSigner({ account });
  const signAndSend = useWalletUiSignAndSend();
  const invalidatePaymentStreamQuery = useInvalidatePaymentStreamQuery();
  const invalidateDashboardStreamsQuery = useInvalidateDashboardStreamsQuery();

  return useMutation({
    mutationFn: async (input: CloseStreamInput) => {
      const employerAddress = account.address;
      const streamAddress = input.stream ?? (await derivePaymentStream(employerAddress, input.employee))[0];

      const instruction = await getCloseStreamInstructionAsync({
        employer: signer,
        stream: streamAddress,
        vault: input.vault,
      });

      return await signAndSend(instruction, signer);
    },
    onSuccess: async (signature) => {
      toastTx(signature, 'Stream closed');
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
