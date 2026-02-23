import { useMutation } from '@tanstack/react-query';
import { UiWalletAccount, useWalletUiSigner } from '@wallet-ui/react';
import type { Address } from 'gill';
import { toast } from 'sonner';

import { getEmployerEmergencyWithdrawInstruction } from '@project/anchor';

import { toastTx } from '@/components/toast-tx';
import { createActivityLog } from '@/features/organization/server/actions/activity-log';

import { useInvalidatePaymentStreamQuery } from '../queries/use-invalidate-payment-stream-query';
import { derivePaymentStream, deriveVault, getErrorMessage } from '../utils/derive-cascade-pdas';
import { useWalletUiSignAndSendWithFallback } from '../utils/use-wallet-ui-sign-and-send-with-fallback';

export type EmergencyWithdrawInput = {
  employee: Address;
  employerTokenAccount: Address;
  stream?: Address;
  vault?: Address;
};

export function useEmergencyWithdrawMutation({ account }: { account: UiWalletAccount }) {
  const signer = useWalletUiSigner({ account });
  const signAndSend = useWalletUiSignAndSendWithFallback();
  const invalidatePaymentStreamQuery = useInvalidatePaymentStreamQuery();

  return useMutation({
    mutationFn: async (input: EmergencyWithdrawInput) => {
      try {
        const employerAddress = account.address;
        const streamAddress = input.stream ?? (await derivePaymentStream(employerAddress, input.employee))[0];
        const vaultAddress = input.vault ?? (await deriveVault(streamAddress))[0];

        const instruction = getEmployerEmergencyWithdrawInstruction({
          employer: signer,
          stream: streamAddress,
          vault: vaultAddress,
          employerTokenAccount: input.employerTokenAccount,
        });

        if (!instruction) {
          throw new Error('Failed to create emergency withdraw instruction');
        }

        console.debug('Emergency withdraw instruction created:', {
          stream: streamAddress,
          employee: input.employee,
        });

        const signature = await signAndSend(instruction, signer);

        if (!signature) {
          throw new Error('Transaction signature is empty');
        }

        return {
          signature,
          streamAddress,
          input,
        };
      } catch (signError) {
        console.error('Error during emergency withdraw instruction creation or signing:', {
          error: signError,
          message: signError instanceof Error ? signError.message : String(signError),
          stack: signError instanceof Error ? signError.stack : undefined,
        });
        throw signError;
      }
    },
    onSuccess: async (result) => {
      const { signature, streamAddress, input } = result;

      toastTx(signature, 'Emergency withdrawal submitted');

      // Log successful emergency withdrawal
      try {
        await createActivityLog({
          title: 'Emergency withdrawal executed',
          description: `Employer withdrew funds from stream (emergency clawback)`,
          activityType: 'stream_emergency_withdraw',
          actorType: 'employer',
          actorAddress: signer.address,
          status: 'success',
          metadata: {
            streamAddress,
            employee: input.employee,
            signature,
          },
        });
      } catch (logError) {
        console.error('Failed to log emergency withdrawal activity:', logError);
      }

      // Wait for transaction confirmation before invalidating cache
      setTimeout(() => {
        invalidatePaymentStreamQuery();
      }, 1500);
    },
    onError: async (error: unknown, variables) => {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage);

      // Check if error is due to user cancellation
      const isCancelled =
        errorMessage.toLowerCase().includes('user rejected') ||
        errorMessage.toLowerCase().includes('user declined') ||
        errorMessage.toLowerCase().includes('cancelled') ||
        errorMessage.toLowerCase().includes('canceled');

      // Log the failed/cancelled attempt
      try {
        await createActivityLog({
          title: isCancelled ? 'Emergency withdrawal cancelled' : 'Emergency withdrawal failed',
          description: isCancelled
            ? `User cancelled emergency withdrawal for stream with employee ${variables.employee}`
            : `Failed to execute emergency withdrawal: ${errorMessage}`,
          activityType: 'stream_emergency_withdraw',
          actorType: 'employer',
          actorAddress: signer.address,
          status: isCancelled ? 'cancelled' : 'failed',
          errorMessage,
          metadata: {
            employee: variables.employee,
            employerTokenAccount: variables.employerTokenAccount,
          },
        });
      } catch (logError) {
        console.error('Failed to log error activity:', logError);
      }
    },
  });
}
