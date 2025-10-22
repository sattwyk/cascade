import { useMutation } from '@tanstack/react-query';
import { UiWalletAccount, useWalletUiSigner } from '@wallet-ui/react';
import { useWalletUiSignAndSend } from '@wallet-ui/react-gill';
import type { Address } from 'gill';
import { toast } from 'sonner';

import { getRefreshActivityInstruction } from '@project/anchor';

import { toastTx } from '@/components/toast-tx';

import { derivePaymentStream, getErrorMessage } from './derive-cascade-pdas';
import { useInvalidatePaymentStreamQuery } from './use-invalidate-payment-stream-query';

export type RefreshActivityInput = {
  employer: Address;
  employee?: Address;
  stream?: Address;
};

export function useRefreshActivityMutation({ account }: { account: UiWalletAccount }) {
  const signer = useWalletUiSigner({ account });
  const signAndSend = useWalletUiSignAndSend();
  const invalidatePaymentStreamQuery = useInvalidatePaymentStreamQuery();

  return useMutation({
    mutationFn: async (input: RefreshActivityInput) => {
      const employeeAddress = input.employee ?? account.address;
      const streamAddress = input.stream ?? (await derivePaymentStream(input.employer, employeeAddress))[0];

      const instruction = getRefreshActivityInstruction({
        employee: signer,
        stream: streamAddress,
      });

      return await signAndSend(instruction, signer);
    },
    onSuccess: async (signature) => {
      toastTx(signature, 'Activity refreshed');
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
