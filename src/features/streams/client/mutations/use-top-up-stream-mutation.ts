import { useMutation } from '@tanstack/react-query';
import { UiWalletAccount, useWalletUiSigner } from '@wallet-ui/react';
import { useWalletUiGill } from '@wallet-ui/react-gill';
import type { Address } from 'gill';
import { toast } from 'sonner';

import { fetchMaybePaymentStream, getTopUpStreamInstruction } from '@project/anchor';

import { toastTx } from '@/components/toast-tx';
import { createActivityLog } from '@/features/organization/server/actions/activity-log';
import { useInvalidateDashboardStreamsQuery } from '@/features/streams/client/queries/use-invalidate-dashboard-streams-query';
import { recordStreamTopUp } from '@/features/streams/server/actions/streams';

import { useInvalidatePaymentStreamQuery } from '../queries/use-invalidate-payment-stream-query';
import { derivePaymentStream, deriveVault, getErrorMessage, toBaseUnits } from '../utils/derive-cascade-pdas';
import { fetchAndValidateMintDecimals } from '../utils/mint-decimals';
import { useWalletUiSignAndSendWithFallback } from '../utils/use-wallet-ui-sign-and-send-with-fallback';

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
  const client = useWalletUiGill();
  const signAndSend = useWalletUiSignAndSendWithFallback();
  const invalidatePaymentStreamQuery = useInvalidatePaymentStreamQuery();
  const invalidateDashboardStreamsQuery = useInvalidateDashboardStreamsQuery();

  return useMutation({
    mutationFn: async (input: TopUpStreamInput) => {
      try {
        const employerAddress = account.address;
        const streamAddress = input.stream ?? (await derivePaymentStream(employerAddress, input.employee))[0];
        const vaultAddress = input.vault ?? (await deriveVault(streamAddress))[0];
        const streamAccount = await fetchMaybePaymentStream(client.rpc, streamAddress);

        if (!streamAccount.exists) {
          throw new Error('Stream not found on-chain for the connected cluster.');
        }

        const mintDecimals = await fetchAndValidateMintDecimals(client.rpc, streamAccount.data.mint);

        const instruction = getTopUpStreamInstruction({
          employer: signer,
          stream: streamAddress,
          vault: vaultAddress,
          employerTokenAccount: input.employerTokenAccount,
          additionalAmount: toBaseUnits(input.additionalAmount, mintDecimals),
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
