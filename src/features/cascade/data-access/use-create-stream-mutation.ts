import { useMutation } from '@tanstack/react-query';
import { UiWalletAccount, useWalletUiSigner } from '@wallet-ui/react';
import { useWalletUiSignAndSend } from '@wallet-ui/react-gill';
import type { Address } from 'gill';
import { toast } from 'sonner';

import { getCreateStreamInstructionAsync } from '@project/anchor';

import { createActivityLog } from '@/app/dashboard/actions/activity-log';
import { createStreamRecord } from '@/app/dashboard/actions/streams';
import { triggerAlertGeneration } from '@/app/dashboard/actions/workflows';
import { toastTx } from '@/components/toast-tx';
import { useInvalidateDashboardStreamsQuery } from '@/features/dashboard/data-access/use-invalidate-dashboard-streams-query';

import { derivePaymentStream, deriveVault, getErrorMessage, toBigInt } from './derive-cascade-pdas';
import { useInvalidatePaymentStreamQuery } from './use-invalidate-payment-stream-query';

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
  const signAndSend = useWalletUiSignAndSend();
  const invalidatePaymentStreamQuery = useInvalidatePaymentStreamQuery();
  const invalidateDashboardStreamsQuery = useInvalidateDashboardStreamsQuery();

  return useMutation({
    mutationFn: async (input: CreateStreamInput) => {
      let signature: string;

      try {
        const instruction = await getCreateStreamInstructionAsync({
          employer: signer,
          employee: input.employee,
          mint: input.mint,
          employerTokenAccount: input.employerTokenAccount,
          hourlyRate: toBigInt(input.hourlyRate),
          totalDeposit: toBigInt(input.totalDeposit),
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
        console.error('Error during instruction creation or signing:', {
          error: signError,
          message: signError instanceof Error ? signError.message : String(signError),
          stack: signError instanceof Error ? signError.stack : undefined,
        });
        throw signError;
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
