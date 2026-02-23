import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UiWalletAccount, useWalletUiSigner } from '@wallet-ui/react';
import { useWalletUiGill } from '@wallet-ui/react-gill';
import { address as toAddress, type Address, type Signature } from 'gill';
import { getAssociatedTokenAccountAddress, getCreateAssociatedTokenIdempotentInstruction } from 'gill/programs/token';
import { toast } from 'sonner';

import { fetchMaybePaymentStream, getWithdrawInstruction } from '@project/anchor';

import { toastTx } from '@/components/toast-tx';
import { EMPLOYEE_DASHBOARD_OVERVIEW_QUERY_KEY } from '@/features/employees/client/queries/use-employee-dashboard-overview-query';
import type { EmployeeDashboardOverview } from '@/features/employees/server/actions/employee-dashboard-overview';
import { createActivityLog } from '@/features/organization/server/actions/activity-log';
import { EMPLOYEE_WITHDRAWALS_QUERY_KEY } from '@/features/streams/client/queries/use-employee-withdrawals-query';
import { recordEmployeeWithdrawal } from '@/features/streams/server/actions/employee-record-withdrawal';
import type { EmployeeWithdrawal } from '@/features/streams/server/actions/employee-withdrawal-history';

import { useInvalidatePaymentStreamQuery } from '../queries/use-invalidate-payment-stream-query';
import { derivePaymentStream, deriveVault, getErrorMessage, toBaseUnits } from '../utils/derive-cascade-pdas';
import { fetchAndValidateMintDecimals } from '../utils/mint-decimals';
import { useWalletUiSignAndSendWithFallback } from '../utils/use-wallet-ui-sign-and-send-with-fallback';

const AMOUNT_DECIMALS = 6;

function formatTokenAmount(value: bigint, decimals: number) {
  const amountScale = 10n ** BigInt(decimals);
  const whole = value / amountScale;
  const fraction = (value % amountScale).toString().padStart(decimals, '0');
  return `${whole.toString()}.${fraction}`;
}

export type WithdrawInput = {
  employer: Address | string;
  mintAddress: Address | string;
  amount: number;
  streamId: string;
  employee?: Address | string;
  stream?: Address | string;
  vault?: Address | string;
  employeeTokenAccount?: Address | string;
};

async function waitForSignatureConfirmation(
  client: ReturnType<typeof useWalletUiGill>,
  signature: Signature,
  { maxAttempts = 12, delayMs = 1000 }: { maxAttempts?: number; delayMs?: number } = {},
) {
  if (!client?.rpc?.getSignatureStatuses) {
    return;
  }

  const getSignatureStatuses = client.rpc.getSignatureStatuses;

  // Poll for confirmation up to the configured attempts.
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const response = await getSignatureStatuses([signature]).send();
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
  const signAndSend = useWalletUiSignAndSendWithFallback();
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
        const mintDecimals = await fetchAndValidateMintDecimals(client.rpc, mintAddress);
        const requestedAmountBaseUnits = toBaseUnits(input.amount, mintDecimals);

        const streamAccount = await fetchMaybePaymentStream(client.rpc, streamAddress);
        if (!streamAccount.exists) {
          throw new Error('Stream not found on-chain for the connected cluster.');
        }
        if (streamAccount.data.employee !== employeeAddressResolved) {
          throw new Error('Connected wallet does not match the employee on this stream.');
        }
        if (!streamAccount.data.isActive) {
          throw new Error('Stream is not active. Withdrawals are disabled.');
        }
        if (streamAccount.data.vault !== vaultAddress) {
          throw new Error('Stream vault mismatch. Please refresh and try again.');
        }
        if (streamAccount.data.mint !== mintAddress) {
          throw new Error('Stream mint mismatch. Please refresh and try again.');
        }

        const secondsElapsed = Math.max(0, Math.floor(Date.now() / 1000) - Number(streamAccount.data.createdAt));
        const hoursElapsed = Math.floor(secondsElapsed / 3600);
        const totalEarnedUncapped = BigInt(hoursElapsed) * streamAccount.data.hourlyRate;
        const totalEarned =
          totalEarnedUncapped > streamAccount.data.totalDeposited
            ? streamAccount.data.totalDeposited
            : totalEarnedUncapped;
        const availableBalance = totalEarned - streamAccount.data.withdrawnAmount;

        if (requestedAmountBaseUnits > availableBalance) {
          const totalDeposited = streamAccount.data.totalDeposited;
          const withdrawnAmount = streamAccount.data.withdrawnAmount;
          const requestedLabel = formatTokenAmount(requestedAmountBaseUnits, mintDecimals);
          const availableLabel = formatTokenAmount(availableBalance > 0n ? availableBalance : 0n, mintDecimals);

          if (totalDeposited <= withdrawnAmount) {
            throw new Error(
              `Stream has no remaining balance to withdraw. Deposited ${formatTokenAmount(
                totalDeposited,
                mintDecimals,
              )} tokens and already withdrawn ${formatTokenAmount(withdrawnAmount, mintDecimals)} tokens.`,
            );
          }

          if (hoursElapsed <= 0) {
            const secondsUntilNextHour = Math.max(0, 3600 - (secondsElapsed % 3600));
            const minutesUntilNextHour = Math.max(1, Math.ceil(secondsUntilNextHour / 60));
            throw new Error(
              `No earnings vested yet. Earnings unlock hourly; try again in about ${minutesUntilNextHour} minute${
                minutesUntilNextHour === 1 ? '' : 's'
              }.`,
            );
          }

          throw new Error(
            `Insufficient vested balance. Requested ${requestedLabel} tokens, but only ${availableLabel} tokens are available right now.`,
          );
        }

        const employeeTokenAccount = input.employeeTokenAccount
          ? typeof input.employeeTokenAccount === 'string'
            ? toAddress(input.employeeTokenAccount)
            : input.employeeTokenAccount
          : await getAssociatedTokenAccountAddress(mintAddress, employeeAddressResolved);

        const withdrawInstruction = getWithdrawInstruction({
          employee: signer,
          stream: streamAddress,
          mint: mintAddress,
          vault: vaultAddress,
          employeeTokenAccount,
          amount: requestedAmountBaseUnits,
        });

        if (!withdrawInstruction) {
          throw new Error('Failed to create withdraw instruction');
        }

        console.debug('Withdraw instruction created:', {
          stream: streamAddress,
          amount: requestedAmountBaseUnits.toString(),
        });

        const ataAccountInfo = await client.rpc.getAccountInfo(employeeTokenAccount, { encoding: 'base64' }).send();
        const instructions = [];

        if (!ataAccountInfo.value) {
          instructions.push(
            getCreateAssociatedTokenIdempotentInstruction({
              payer: signer,
              ata: employeeTokenAccount,
              owner: employeeAddressResolved,
              mint: mintAddress,
              tokenProgram: toAddress('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
            }),
          );
        }

        instructions.push(withdrawInstruction);

        const signature = await signAndSend(instructions, signer);
        if (!signature) {
          throw new Error('Transaction signature is empty');
        }

        await waitForSignatureConfirmation(client, signature as Signature);

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
          description: `You withdrew ${variables.amount.toFixed(AMOUNT_DECIMALS)} tokens`,
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
          description: `Employee withdrew ${variables.amount.toFixed(AMOUNT_DECIMALS)} tokens from stream`,
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
            ? `Employee cancelled a withdrawal attempt of ${variables?.amount?.toFixed(AMOUNT_DECIMALS) ?? 'unknown'} tokens`
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
