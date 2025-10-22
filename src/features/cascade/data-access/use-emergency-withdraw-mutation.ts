import { useMutation } from '@tanstack/react-query';
import { UiWalletAccount, useWalletUiSigner } from '@wallet-ui/react';
import { useWalletUiSignAndSend } from '@wallet-ui/react-gill';
import type { Address } from 'gill';
import { toast } from 'sonner';

import { getEmployerEmergencyWithdrawInstruction } from '@project/anchor';

import { toastTx } from '@/components/toast-tx';

import { derivePaymentStream, deriveVault, getErrorMessage } from './derive-cascade-pdas';
import { useInvalidatePaymentStreamQuery } from './use-invalidate-payment-stream-query';

export type EmergencyWithdrawInput = {
  employee: Address;
  employerTokenAccount: Address;
  stream?: Address;
  vault?: Address;
};

export function useEmergencyWithdrawMutation({ account }: { account: UiWalletAccount }) {
  const signer = useWalletUiSigner({ account });
  const signAndSend = useWalletUiSignAndSend();
  const invalidatePaymentStreamQuery = useInvalidatePaymentStreamQuery();

  return useMutation({
    mutationFn: async (input: EmergencyWithdrawInput) => {
      const employerAddress = account.address;
      const streamAddress = input.stream ?? (await derivePaymentStream(employerAddress, input.employee))[0];
      const vaultAddress = input.vault ?? (await deriveVault(streamAddress))[0];

      const instruction = getEmployerEmergencyWithdrawInstruction({
        employer: signer,
        stream: streamAddress,
        vault: vaultAddress,
        employerTokenAccount: input.employerTokenAccount,
      });

      return await signAndSend(instruction, signer);
    },
    onSuccess: async (signature) => {
      toastTx(signature, 'Emergency withdrawal submitted');
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
