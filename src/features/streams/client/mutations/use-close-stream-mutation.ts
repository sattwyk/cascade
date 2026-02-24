import { useMutation } from '@tanstack/react-query';
import { UiWalletAccount, useWalletUiSigner } from '@wallet-ui/react';
import { useWalletUiGill } from '@wallet-ui/react-gill';
import type { Address } from 'gill';
import { toast } from 'sonner';

import { fetchMaybePaymentStream, getCloseStreamInstructionAsync } from '@project/anchor';

import { toastTx } from '@/components/toast-tx';
import { createActivityLog } from '@/features/organization/server/actions/activity-log';
import { useInvalidateDashboardStreamsQuery } from '@/features/streams/client/queries/use-invalidate-employer-streams-query';

import { useInvalidatePaymentStreamQuery } from '../queries/use-invalidate-payment-stream-query';
import { derivePaymentStream, getErrorMessage } from '../utils/derive-cascade-pdas';
import { useWalletUiSignAndSendWithFallback } from '../utils/use-wallet-ui-sign-and-send-with-fallback';

export type CloseStreamInput = {
  employee: Address;
  employerTokenAccount: Address;
  stream?: Address;
  vault?: Address;
};

export function useCloseStreamMutation({ account }: { account: UiWalletAccount }) {
  const signer = useWalletUiSigner({ account });
  const client = useWalletUiGill();
  const signAndSend = useWalletUiSignAndSendWithFallback();
  const invalidatePaymentStreamQuery = useInvalidatePaymentStreamQuery();
  const invalidateDashboardStreamsQuery = useInvalidateDashboardStreamsQuery();

  return useMutation({
    mutationFn: async (input: CloseStreamInput) => {
      try {
        const employerAddress = account.address;
        const streamAddress = input.stream ?? (await derivePaymentStream(employerAddress, input.employee))[0];
        const streamAccount = await fetchMaybePaymentStream(client.rpc, streamAddress);

        if (!streamAccount.exists) {
          throw new Error('Stream not found on-chain for the connected cluster.');
        }

        const instruction = await getCloseStreamInstructionAsync({
          employer: signer,
          stream: streamAddress,
          mint: streamAccount.data.mint,
          vault: input.vault,
          employerTokenAccount: input.employerTokenAccount,
        });

        if (!instruction) {
          throw new Error('Failed to create close stream instruction');
        }

        console.debug('Close stream instruction created:', {
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
        console.error('Error during close stream instruction creation or signing:', {
          error: signError,
          message: signError instanceof Error ? signError.message : String(signError),
          stack: signError instanceof Error ? signError.stack : undefined,
        });
        throw signError;
      }
    },
    onSuccess: async (result) => {
      const { signature, streamAddress, input } = result;

      toastTx(signature, 'Stream closed');

      // Log successful stream closure
      try {
        await createActivityLog({
          title: 'Stream closed',
          description: `Payment stream closed by employer`,
          activityType: 'stream_closed',
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
        console.error('Failed to log stream closure activity:', logError);
      }

      // Wait for transaction confirmation before invalidating cache
      setTimeout(() => {
        invalidatePaymentStreamQuery();
        invalidateDashboardStreamsQuery();
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
          title: isCancelled ? 'Stream closure cancelled' : 'Stream closure failed',
          description: isCancelled
            ? `User cancelled stream closure for employee ${variables.employee}`
            : `Failed to close stream: ${errorMessage}`,
          activityType: 'stream_closed',
          actorType: 'employer',
          actorAddress: signer.address,
          status: isCancelled ? 'cancelled' : 'failed',
          errorMessage,
          metadata: {
            employee: variables.employee,
          },
        });
      } catch (logError) {
        console.error('Failed to log error activity:', logError);
      }
    },
  });
}
