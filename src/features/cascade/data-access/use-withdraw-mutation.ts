import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UiWalletAccount, useWalletUiSigner } from '@wallet-ui/react';
import { useWalletUiGill, useWalletUiSignAndSend } from '@wallet-ui/react-gill';
import { address as toAddress, type Address } from 'gill';
import { getAssociatedTokenAccountAddress, getCreateAssociatedTokenIdempotentInstruction } from 'gill/programs/token';
import { toast } from 'sonner';

import { getWithdrawInstruction } from '@project/anchor';

import type { EmployeeDashboardOverview } from '@/app/dashboard/@employee/actions/overview';
import { recordEmployeeWithdrawal } from '@/app/dashboard/@employee/actions/record-withdrawal';
import type { EmployeeWithdrawal } from '@/app/dashboard/@employee/actions/withdrawal-history';
import { createActivityLog } from '@/app/dashboard/actions/activity-log';
import { toastTx } from '@/components/toast-tx';
import { EMPLOYEE_DASHBOARD_OVERVIEW_QUERY_KEY } from '@/features/employee-dashboard/data-access/use-employee-dashboard-overview-query';
import { EMPLOYEE_WITHDRAWALS_QUERY_KEY } from '@/features/employee-dashboard/data-access/use-employee-withdrawals-query';

import { derivePaymentStream, deriveVault, getErrorMessage } from './derive-cascade-pdas';
import { useInvalidatePaymentStreamQuery } from './use-invalidate-payment-stream-query';

export type WithdrawInput = {
  employer: Address | string;
  mintAddress: Address | string;
  amount: number;
  amountBaseUnits: bigint;
  streamId: string;
  employee?: Address | string;
  stream?: Address | string;
  vault?: Address | string;
  employeeTokenAccount?: Address | string;
};

async function waitForSignatureConfirmation(
  client: ReturnType<typeof useWalletUiGill>,
  signature: string,
  { maxAttempts = 12, delayMs = 1000 }: { maxAttempts?: number; delayMs?: number } = {},
) {
  if (!client?.rpc?.getSignatureStatuses) {
    return;
  }

  const getSignatureStatuses = client.rpc.getSignatureStatuses;

  // Poll for confirmation up to the configured attempts.
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const response = await getSignatureStatuses([signature] as Parameters<typeof getSignatureStatuses>[0]).send();
      const status = response?.value?.[0];

      if (status?.err) {
        const serializedError =
          typeof status.err === 'object' && status.err !== null ? JSON.stringify(status.err) : 'Transaction failed';
        throw new Error(`Transaction failed on-chain (${signature}): ${serializedError}`);
      }

      // Consider the transaction confirmed once the RPC reports any confirmation status.
      if (status && (status.confirmationStatus || typeof status.slot === 'number')) {
        return;
      }
    } catch (pollError) {
      // Network hiccups while polling should retry until attempts are exhausted.
      if (attempt === maxAttempts - 1) {
        const message = pollError instanceof Error ? pollError.message : String(pollError);
        throw new Error(`Unable to verify transaction ${signature}: ${message}`);
      }
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error(`Confirmation timeout for ${signature}: the network has not recorded this transaction yet.`);
}

export function useWithdrawMutation({ account }: { account: UiWalletAccount }) {
  const signer = useWalletUiSigner({ account });
  const signAndSend = useWalletUiSignAndSend();
  const client = useWalletUiGill();
  const invalidatePaymentStreamQuery = useInvalidatePaymentStreamQuery();
  const queryClient = useQueryClient();

  const isUserCancelled = (message: string) => {
    const normalized = message.toLowerCase();
    return (
      normalized.includes('user rejected') ||
      normalized.includes('user declined') ||
      normalized.includes('user canceled') ||
      normalized.includes('user cancelled') ||
      normalized.includes('rejected the request')
    );
  };

  return useMutation({
    mutationFn: async (input: WithdrawInput) => {
      try {
        const employerAddress = typeof input.employer === 'string' ? toAddress(input.employer) : input.employer;
        const employeeAddress = input.employee ?? account.address;
        const employeeAddressResolved =
          typeof employeeAddress === 'string' ? toAddress(employeeAddress) : employeeAddress;

        const streamAddress = input.stream
          ? typeof input.stream === 'string'
            ? toAddress(input.stream)
            : input.stream
          : (await derivePaymentStream(employerAddress, employeeAddressResolved))[0];

        const vaultAddress = input.vault
          ? typeof input.vault === 'string'
            ? toAddress(input.vault)
            : input.vault
          : (await deriveVault(streamAddress))[0];

        const mintAddress = typeof input.mintAddress === 'string' ? toAddress(input.mintAddress) : input.mintAddress;

        const employeeTokenAccount = input.employeeTokenAccount
          ? typeof input.employeeTokenAccount === 'string'
            ? toAddress(input.employeeTokenAccount)
            : input.employeeTokenAccount
          : await getAssociatedTokenAccountAddress(mintAddress, employeeAddressResolved);

        const withdrawInstruction = getWithdrawInstruction({
          employee: signer,
          stream: streamAddress,
          vault: vaultAddress,
          employeeTokenAccount,
          amount: input.amountBaseUnits,
        });

        if (!withdrawInstruction) {
          throw new Error('Failed to create withdraw instruction');
        }

        console.debug('Withdraw instruction created:', {
          stream: streamAddress,
          amount: input.amountBaseUnits.toString(),
        });

        const createAtaInstruction = getCreateAssociatedTokenIdempotentInstruction({
          payer: signer,
          ata: employeeTokenAccount,
          owner: employeeAddressResolved,
          mint: mintAddress,
          tokenProgram: toAddress('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
        });

        const signature = await signAndSend([createAtaInstruction, withdrawInstruction], signer);
        if (!signature) {
          throw new Error('Transaction signature is empty');
        }

        await waitForSignatureConfirmation(client, signature);

        return {
          signature,
          streamAddress,
          vaultAddress,
          employeeTokenAccount,
        };
      } catch (signError) {
        const message = signError instanceof Error ? signError.message : String(signError);
        console.error('Error during withdraw instruction creation or signing:', {
          error: signError,
          message,
          stack: signError instanceof Error ? signError.stack : undefined,
        });
        throw signError instanceof Error ? signError : new Error(message);
      }
    },
    onSuccess: async (result, variables) => {
      toastTx(result.signature, 'Withdrawal completed');

      let recordResult: Awaited<ReturnType<typeof recordEmployeeWithdrawal>> | null = null;
      try {
        recordResult = await recordEmployeeWithdrawal({
          streamId: variables.streamId,
          streamAddress: String(result.streamAddress),
          amount: variables.amount,
          signature: result.signature,
          tokenAccount: String(result.employeeTokenAccount),
          mintAddress:
            typeof variables.mintAddress === 'string' ? variables.mintAddress : String(variables.mintAddress),
        });

        if (recordResult && !recordResult.ok) {
          // Reasons that should NOT show error toasts (normal degraded modes)
          const gracefulReasons = ['database-disabled', 'stream-not-found', 'identity-required', 'employee-not-found'];

          if (gracefulReasons.includes(recordResult.reason)) {
            console.warn('[withdraw] Dashboard persistence skipped:', recordResult.reason);

            // Only show informational toast for stream-not-found (most common case)
            if (recordResult.reason === 'stream-not-found') {
              toast.info('Withdrawal confirmed on-chain. Dashboard will sync shortly.');
            }
          } else {
            // Actual errors: insufficient-funds, database-error, invalid-input
            console.error('[withdraw] Dashboard persistence failed:', recordResult);
            toast.error(`Withdrawal succeeded but: ${recordResult.error}`);
          }
        }
      } catch (recordError) {
        console.error('[withdraw] Exception recording withdrawal', recordError);
        toast.warning('Withdrawal succeeded on-chain. Dashboard may take a moment to update.');
      }

      // Log activity for EMPLOYEE perspective
      try {
        await createActivityLog({
          title: 'Withdrawal completed',
          description: `You withdrew ${variables.amount.toFixed(2)} tokens`,
          activityType: 'stream_withdrawn',
          actorType: 'employee',
          actorAddress: signer.address,
          streamId: variables.streamId,
          status: 'success',
          metadata: {
            amount: variables.amount,
            streamAddress: String(result.streamAddress),
            signature: result.signature,
            actor: 'employee',
          },
        });
      } catch (activityError) {
        console.error('[withdraw] Failed to log employee withdrawal activity', activityError);
      }

      // Log activity for EMPLOYER perspective (they see who withdrew)
      try {
        await createActivityLog({
          title: 'Employee withdrawal',
          description: `Employee withdrew ${variables.amount.toFixed(2)} tokens from stream`,
          activityType: 'stream_withdrawn',
          actorType: 'employee',
          actorAddress: signer.address,
          streamId: variables.streamId,
          status: 'success',
          metadata: {
            amount: variables.amount,
            streamAddress: String(result.streamAddress),
            signature: result.signature,
            actor: 'employee',
            visibleToEmployer: true,
          },
        });
      } catch (activityError) {
        console.error('[withdraw] Failed to log employer-facing withdrawal activity', activityError);
      }

      const optimisticUpdate =
        recordResult &&
        !recordResult.ok &&
        (recordResult.reason === 'database-disabled' || recordResult.reason === 'stream-not-found')
          ? () => {
              const nowIso = new Date().toISOString();
              queryClient.setQueryData<EmployeeDashboardOverview | undefined>(
                EMPLOYEE_DASHBOARD_OVERVIEW_QUERY_KEY,
                (previous) => {
                  if (!previous) return previous;

                  const updatedStreams = previous.streams.map((stream) => {
                    if (stream.id !== variables.streamId) return stream;
                    const newAvailable = Math.max(stream.availableBalance - variables.amount, 0);
                    return {
                      ...stream,
                      withdrawnAmount: stream.withdrawnAmount + variables.amount,
                      availableBalance: newAvailable,
                    };
                  });

                  const updatedStats = {
                    ...previous.stats,
                    availableToWithdraw: Math.max(previous.stats.availableToWithdraw - variables.amount, 0),
                  };

                  const nextWithdrawals = [
                    {
                      id: `local-${Date.now()}`,
                      streamId: variables.streamId,
                      amount: variables.amount,
                      occurredAt: nowIso,
                      signature: result.signature,
                    },
                    ...previous.recentWithdrawals,
                  ].slice(0, 5);

                  return {
                    ...previous,
                    stats: updatedStats,
                    streams: updatedStreams,
                    recentWithdrawals: nextWithdrawals,
                    activity: {
                      ...previous.activity,
                      lastActivityAt: nowIso,
                    },
                  };
                },
              );

              queryClient.setQueryData<EmployeeWithdrawal[] | undefined>(EMPLOYEE_WITHDRAWALS_QUERY_KEY, (previous) => {
                const nextEntry: EmployeeWithdrawal = {
                  id: `local-${Date.now()}`,
                  streamId: variables.streamId,
                  amount: variables.amount,
                  occurredAt: nowIso,
                  signature: result.signature ?? null,
                  employerName: null,
                };

                if (!previous || previous.length === 0) {
                  return [nextEntry];
                }

                return [nextEntry, ...previous].slice(0, 100);
              });
            }
          : null;

      // Wait for transaction confirmation before invalidating cache
      setTimeout(() => {
        invalidatePaymentStreamQuery();
        if (optimisticUpdate) {
          optimisticUpdate();
        } else {
          queryClient.invalidateQueries({ queryKey: EMPLOYEE_DASHBOARD_OVERVIEW_QUERY_KEY });
        }
        queryClient.invalidateQueries({ queryKey: EMPLOYEE_WITHDRAWALS_QUERY_KEY });
      }, 1500);
    },
    onError: async (error: unknown, variables) => {
      const errorMessage = getErrorMessage(error);
      const cancelled = isUserCancelled(errorMessage);

      if (cancelled) {
        toast.info('Withdrawal cancelled');
      } else {
        toast.error(errorMessage);
      }

      const status = cancelled ? 'cancelled' : 'failed';

      // Log activity for EMPLOYEE perspective
      try {
        await createActivityLog({
          title: cancelled ? 'Withdrawal cancelled' : 'Withdrawal failed',
          description: errorMessage,
          activityType: 'stream_withdrawn',
          actorType: 'employee',
          actorAddress: signer.address,
          streamId: variables?.streamId,
          status,
          errorMessage,
          metadata: {
            amount: variables?.amount ?? null,
            streamAddress: variables?.stream ? String(variables.stream) : undefined,
            actor: 'employee',
          },
        });
      } catch (activityError) {
        console.error('[withdraw] Failed to log employee withdrawal error activity', activityError);
      }

      // Log activity for EMPLOYER perspective
      try {
        await createActivityLog({
          title: cancelled ? 'Employee cancelled withdrawal' : 'Employee withdrawal failed',
          description: cancelled
            ? `Employee cancelled a withdrawal attempt of ${variables?.amount?.toFixed(2) ?? 'unknown'} tokens`
            : `Employee withdrawal attempt failed: ${errorMessage}`,
          activityType: 'stream_withdrawn',
          actorType: 'employee',
          actorAddress: signer.address,
          streamId: variables?.streamId,
          status,
          errorMessage: cancelled ? undefined : errorMessage,
          metadata: {
            amount: variables?.amount ?? null,
            streamAddress: variables?.stream ? String(variables.stream) : undefined,
            actor: 'employee',
            visibleToEmployer: true,
          },
        });
      } catch (activityError) {
        console.error('[withdraw] Failed to log employer-facing withdrawal error activity', activityError);
      }
    },
  });
}
