import { useMutation } from '@tanstack/react-query';
import { UiWalletAccount, useWalletUiSigner } from '@wallet-ui/react';
import { useWalletUiGill } from '@wallet-ui/react-gill';
import type { Address } from 'gill';
import { toast } from 'sonner';

import { fetchMaybePaymentStream, getCreateStreamInstructionAsync } from '@project/anchor';

import { toastTx } from '@/components/toast-tx';
import { triggerAlertGeneration } from '@/features/alerts/server/actions/workflows';
import { createActivityLog } from '@/features/organization/server/actions/activity-log';
import { useInvalidateDashboardStreamsQuery } from '@/features/streams/client/queries/use-invalidate-dashboard-streams-query';
import { createStreamRecord } from '@/features/streams/server/actions/streams';

import { useInvalidatePaymentStreamQuery } from '../queries/use-invalidate-payment-stream-query';
import { derivePaymentStream, deriveVault, getErrorMessage, toBaseUnits } from '../utils/derive-cascade-pdas';
import { fetchAndValidateMintDecimals } from '../utils/mint-decimals';
import { useWalletUiSignAndSendWithFallback } from '../utils/use-wallet-ui-sign-and-send-with-fallback';

export type CreateStreamInput = {
  employee: Address;
  employeeId?: string;
  mint: Address;
  employerTokenAccount: Address;
  hourlyRate: number | bigint;
  totalDeposit: number | bigint;
  cluster?: 'devnet' | 'testnet' | 'mainnet' | 'localnet' | 'custom';
};

export function useCreateStreamMutation({ account }: { account: UiWalletAccount }) {
  const signer = useWalletUiSigner({ account });
  const client = useWalletUiGill();
  const signAndSend = useWalletUiSignAndSendWithFallback();
  const invalidatePaymentStreamQuery = useInvalidatePaymentStreamQuery();
  const invalidateDashboardStreamsQuery = useInvalidateDashboardStreamsQuery();

  return useMutation({
    mutationFn: async (input: CreateStreamInput) => {
      let signature: string;

      try {
        const [streamPda] = await derivePaymentStream(signer.address, input.employee);
        const [vaultPda] = await deriveVault(streamPda);

        const existingStream = await fetchMaybePaymentStream(client.rpc, streamPda);
        if (existingStream.exists) {
          throw new Error('Stream already exists for this employee. Top up or close it before creating a new one.');
        }

        const mintDecimals = await fetchAndValidateMintDecimals(client.rpc, input.mint);

        const instruction = await getCreateStreamInstructionAsync({
          employer: signer,
          employee: input.employee,
          mint: input.mint,
          stream: streamPda,
          vault: vaultPda,
          employerTokenAccount: input.employerTokenAccount,
          hourlyRate: toBaseUnits(input.hourlyRate, mintDecimals),
          totalDeposit: toBaseUnits(input.totalDeposit, mintDecimals),
        });

        // Validate instruction before signing
        if (!instruction) {
          throw new Error('Failed to create stream instruction');
        }

        console.debug('Stream instruction created:', {
          employer: signer.address,
          employee: input.employee,
          mint: input.mint,
          hourlyRate: input.hourlyRate.toString(),
          totalDeposit: input.totalDeposit.toString(),
        });

        signature = await signAndSend(instruction, signer);

        if (!signature) {
          throw new Error('Transaction signature is empty');
        }
      } catch (signError) {
        const message = getErrorMessage(signError);
        console.error('Error during instruction creation or signing:', {
          error: signError,
          message,
          stack: signError instanceof Error ? signError.stack : undefined,
          cause: signError instanceof Error ? signError.cause : undefined,
        });
        throw signError instanceof Error ? signError : new Error(message);
      }

      // Derive PDAs for database storage
      const [streamPda] = await derivePaymentStream(signer.address, input.employee);
      const [vaultPda] = await deriveVault(streamPda);

      // Return all data needed for database persistence
      return {
        signature,
        streamAddress: streamPda,
        vaultAddress: vaultPda,
        input,
      };
    },
    onSuccess: async (result) => {
      const { signature, streamAddress, vaultAddress, input } = result;

      toastTx(signature, 'Stream created');

      // Persist stream to database if employeeId is provided
      if (input.employeeId) {
        try {
          const dbResult = await createStreamRecord({
            streamAddress,
            vaultAddress,
            employeeId: input.employeeId,
            employerWallet: signer.address,
            employerTokenAccount: input.employerTokenAccount,
            mintAddress: input.mint,
            hourlyRate: input.hourlyRate,
            totalDeposited: input.totalDeposit,
            createdSignature: signature,
            cluster: input.cluster ?? 'devnet',
          });

          if (dbResult.ok) {
            console.log('Stream persisted to database:', dbResult.streamId);

            // Generate alerts for the new stream using workflow
            try {
              // Trigger the alert generation workflow via server action
              const result = await triggerAlertGeneration();
              if (result.ok) {
                console.log('Alert generation workflow started:', result.runId);
              } else {
                console.error('Failed to start alert generation:', result.error);
              }
            } catch (alertError) {
              console.error('Failed to start alert generation workflow:', alertError);
            }
          } else {
            console.error('Failed to persist stream to database:', dbResult.reason);
            toast.error('Stream created on-chain but failed to save to database');
          }
        } catch (error) {
          console.error('Error persisting stream:', error);
          toast.error('Stream created on-chain but failed to save to database');
        }
      } else {
        console.warn('No employeeId provided, stream not persisted to database');
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
          title: isCancelled ? 'Stream creation cancelled' : 'Stream creation failed',
          description: isCancelled
            ? `User cancelled stream creation for employee ${variables.employee}`
            : `Failed to create stream: ${errorMessage}`,
          activityType: 'stream_created',
          actorType: 'employer',
          actorAddress: signer.address,
          status: isCancelled ? 'cancelled' : 'failed',
          errorMessage,
          metadata: {
            employee: variables.employee,
            mint: variables.mint,
            hourlyRate: variables.hourlyRate.toString(),
            totalDeposit: variables.totalDeposit.toString(),
            employerTokenAccount: variables.employerTokenAccount,
          },
        });
      } catch (logError) {
        console.error('Failed to log error activity:', logError);
      }
    },
  });
}
