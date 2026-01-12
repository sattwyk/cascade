import { useMutation } from '@tanstack/react-query';
import { UiWalletAccount, useWalletUiSigner } from '@wallet-ui/react';
import type { Address } from 'gill';
import { toast } from 'sonner';

import { getTopUpStreamInstruction } from '@project/anchor';

import { createActivityLog } from '@/app/dashboard/actions/activity-log';
import { recordStreamTopUp } from '@/app/dashboard/actions/streams';
import { toastTx } from '@/components/toast-tx';
import { useInvalidateDashboardStreamsQuery } from '@/features/dashboard/data-access/use-invalidate-dashboard-streams-query';

import { derivePaymentStream, deriveVault, getErrorMessage, toBigInt } from './derive-cascade-pdas';
import { useInvalidatePaymentStreamQuery } from './use-invalidate-payment-stream-query';
import { useWalletUiSignAndSendWithFallback } from './use-wallet-ui-sign-and-send-with-fallback';

export type TopUpStreamInput = {
  streamId?: string;
  employee: Address;
  employerTokenAccount: Address;
  additionalAmount: number | bigint;
  stream?: Address;
  vault?: Address;
};

export function useTopUpStreamMutation({ account }: { account: UiWalletAccount }) {
  const signer = useWalletUiSigner({ account });
  const signAndSend = useWalletUiSignAndSendWithFallback();
  const invalidatePaymentStreamQuery = useInvalidatePaymentStreamQuery();
  const invalidateDashboardStreamsQuery = useInvalidateDashboardStreamsQuery();

  return useMutation({
    mutationFn: async (input: TopUpStreamInput) => {
      try {
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

        if (!instruction) {
          throw new Error('Failed to create top-up instruction');
        }

        console.debug('Top-up instruction created:', {
          stream: streamAddress,
          additionalAmount: input.additionalAmount.toString(),
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
        console.error('Error during top-up instruction creation or signing:', {
          error: signError,
          message: signError instanceof Error ? signError.message : String(signError),
          stack: signError instanceof Error ? signError.stack : undefined,
        });
        throw signError;
      }
    },
    onSuccess: async (result) => {
      const { signature, streamAddress, input } = result;

      toastTx(signature, 'Stream funded');

      const topUpAmount =
        typeof input.additionalAmount === 'bigint' ? Number(input.additionalAmount) : input.additionalAmount;

      if (Number.isFinite(topUpAmount) && input.streamId) {
        try {
          const recordResult = await recordStreamTopUp({
            streamId: input.streamId,
            streamAddress: String(streamAddress),
            amount: topUpAmount,
            signature,
            employerTokenAccount: String(input.employerTokenAccount),
            actorAddress: signer.address,
          });

          if (recordResult.ok === false) {
            const quietReasons = [
              'database-disabled',
              'identity-required',
              'organization-not-found',
              'stream-not-found',
              'stream-mismatch',
            ];
            if (quietReasons.includes(recordResult.reason)) {
              console.warn('[stream-top-up] Dashboard persistence skipped:', recordResult.reason);
            } else {
              toast.error(`Stream funded on-chain but: ${recordResult.error}`);
            }
          }
        } catch (recordError) {
          console.error('[stream-top-up] Failed to record top up', recordError);
          toast.warning('Stream funded on-chain. Dashboard may take a moment to update.');
        }
      } else if (!input.streamId) {
        console.warn('[stream-top-up] Missing streamId for dashboard update.');
      }

      // Log successful top-up
      try {
        await createActivityLog({
          title: 'Stream topped up',
          description: `Added ${input.additionalAmount} tokens to stream`,
          activityType: 'stream_top_up',
          actorType: 'employer',
          actorAddress: signer.address,
          streamId: input.streamId,
          status: 'success',
          metadata: {
            streamAddress,
            employee: input.employee,
            additionalAmount: input.additionalAmount.toString(),
            signature,
          },
        });
      } catch (logError) {
        console.error('Failed to log top-up activity:', logError);
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
          title: isCancelled ? 'Stream top-up cancelled' : 'Stream top-up failed',
          description: isCancelled
            ? `User cancelled top-up for stream with employee ${variables.employee}`
            : `Failed to top up stream: ${errorMessage}`,
          activityType: 'stream_top_up',
          actorType: 'employer',
          actorAddress: signer.address,
          status: isCancelled ? 'cancelled' : 'failed',
          errorMessage,
          metadata: {
            employee: variables.employee,
            additionalAmount: variables.additionalAmount.toString(),
            employerTokenAccount: variables.employerTokenAccount,
          },
        });
      } catch (logError) {
        console.error('Failed to log error activity:', logError);
      }
    },
  });
}
