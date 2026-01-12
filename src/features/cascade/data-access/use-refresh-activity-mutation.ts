import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UiWalletAccount, useWalletUiSigner } from '@wallet-ui/react';
import { address as toAddress, type Address } from 'gill';
import { toast } from 'sonner';

import { getRefreshActivityInstruction } from '@project/anchor';

import type { EmployeeDashboardOverview } from '@/app/dashboard/@employee/actions/overview';
import { recordEmployeeActivityRefresh } from '@/app/dashboard/@employee/actions/refresh-activity';
import { createActivityLog } from '@/app/dashboard/actions/activity-log';
import { toastTx } from '@/components/toast-tx';
import { EMPLOYEE_DASHBOARD_OVERVIEW_QUERY_KEY } from '@/features/employee-dashboard/data-access/use-employee-dashboard-overview-query';

import { derivePaymentStream, getErrorMessage } from './derive-cascade-pdas';
import { useInvalidatePaymentStreamQuery } from './use-invalidate-payment-stream-query';
import { useWalletUiSignAndSendWithFallback } from './use-wallet-ui-sign-and-send-with-fallback';

export type RefreshActivityInput = {
  employer: Address | string;
  streamId: string;
  streamAddress?: Address | string;
  employee?: Address | string;
};

export function useRefreshActivityMutation({ account }: { account: UiWalletAccount }) {
  const signer = useWalletUiSigner({ account });
  const signAndSend = useWalletUiSignAndSendWithFallback();
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
    mutationFn: async (input: RefreshActivityInput) => {
      try {
        const employerAddress = typeof input.employer === 'string' ? toAddress(input.employer) : input.employer;
        const employeeAddress = input.employee ?? account.address;
        const employeeAddressResolved =
          typeof employeeAddress === 'string' ? toAddress(employeeAddress) : employeeAddress;
        const streamAddress =
          input.streamAddress != null
            ? typeof input.streamAddress === 'string'
              ? toAddress(input.streamAddress)
              : input.streamAddress
            : (await derivePaymentStream(employerAddress, employeeAddressResolved))[0];

        const instruction = getRefreshActivityInstruction({
          employee: signer,
          stream: streamAddress,
        });

        if (!instruction) {
          throw new Error('Failed to create refresh activity instruction');
        }

        console.debug('Refresh activity instruction created:', {
          stream: streamAddress,
        });

        const signature = await signAndSend(instruction, signer);

        if (!signature) {
          throw new Error('Transaction signature is empty');
        }

        return {
          signature,
          streamAddress,
        };
      } catch (signError) {
        const message = signError instanceof Error ? signError.message : String(signError);
        console.error('Error during refresh activity instruction creation or signing:', {
          error: signError,
          message,
          stack: signError instanceof Error ? signError.stack : undefined,
        });
        throw signError instanceof Error ? signError : new Error(message);
      }
    },
    onSuccess: async (result, variables) => {
      toastTx(result.signature, 'Activity refreshed');

      let recordResult: Awaited<ReturnType<typeof recordEmployeeActivityRefresh>> | null = null;

      try {
        recordResult = await recordEmployeeActivityRefresh({
          streamId: variables.streamId,
          streamAddress: String(result.streamAddress),
          signature: result.signature,
        });

        if (recordResult && !recordResult.ok) {
          if (recordResult.reason === 'database-disabled') {
            console.warn('[refresh-activity] Database disabled, using optimistic client update');
          } else {
            console.error('[refresh-activity] Refresh recorded with warning', recordResult);
            toast.error(recordResult.error);
          }
        }
      } catch (recordError) {
        console.error('[refresh-activity] Failed to record refresh in database', recordError);
        toast.error('Activity refreshed on-chain but we could not update the dashboard.');
      }

      // Log activity for EMPLOYEE perspective
      try {
        await createActivityLog({
          title: 'Activity refreshed',
          description: 'You refreshed your activity timer',
          activityType: 'stream_refresh_activity',
          actorType: 'employee',
          actorAddress: signer.address,
          streamId: variables.streamId,
          status: 'success',
          metadata: {
            streamAddress: String(result.streamAddress),
            signature: result.signature,
            actor: 'employee',
          },
        });
      } catch (activityError) {
        console.error('[refresh-activity] Failed to log employee refresh activity', activityError);
      }

      // Log activity for EMPLOYER perspective
      try {
        await createActivityLog({
          title: 'Employee refreshed activity',
          description: 'Employee confirmed they are still actively working',
          activityType: 'stream_refresh_activity',
          actorType: 'employee',
          actorAddress: signer.address,
          streamId: variables.streamId,
          status: 'success',
          metadata: {
            streamAddress: String(result.streamAddress),
            signature: result.signature,
            actor: 'employee',
            visibleToEmployer: true,
          },
        });
      } catch (activityError) {
        console.error('[refresh-activity] Failed to log employer-facing refresh activity', activityError);
      }

      const optimisticUpdate =
        recordResult && !recordResult.ok && recordResult.reason === 'database-disabled'
          ? () => {
              const nowIso = new Date().toISOString();
              queryClient.setQueryData<EmployeeDashboardOverview | undefined>(
                EMPLOYEE_DASHBOARD_OVERVIEW_QUERY_KEY,
                (previous) => {
                  if (!previous) return previous;

                  const updatedStreams = previous.streams.map((stream) => {
                    if (stream.id !== variables.streamId) return stream;
                    return {
                      ...stream,
                      lastActivityAt: nowIso,
                    };
                  });

                  return {
                    ...previous,
                    streams: updatedStreams,
                    activity: {
                      ...previous.activity,
                      lastActivityAt: nowIso,
                      daysUntilEmployerWithdrawal: 30,
                    },
                  };
                },
              );
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
      }, 1500);
    },
    onError: async (error: unknown, variables) => {
      const errorMessage = getErrorMessage(error);
      const cancelled = isUserCancelled(errorMessage);

      if (cancelled) {
        toast.info('Activity refresh cancelled');
      } else {
        toast.error(errorMessage);
      }

      const status = cancelled ? 'cancelled' : 'failed';

      // Log activity for EMPLOYEE perspective
      try {
        await createActivityLog({
          title: cancelled ? 'Activity refresh cancelled' : 'Activity refresh failed',
          description: errorMessage,
          activityType: 'stream_refresh_activity',
          actorType: 'employee',
          actorAddress: signer.address,
          streamId: variables?.streamId,
          status,
          errorMessage,
          metadata: {
            streamAddress: variables?.streamAddress ? String(variables.streamAddress) : (variables?.streamId ?? null),
            actor: 'employee',
          },
        });
      } catch (activityError) {
        console.error('[refresh-activity] Failed to log employee refresh error activity', activityError);
      }

      // Log activity for EMPLOYER perspective
      try {
        await createActivityLog({
          title: cancelled ? 'Employee cancelled activity refresh' : 'Employee activity refresh failed',
          description: cancelled
            ? 'Employee cancelled an activity refresh attempt'
            : `Employee activity refresh failed: ${errorMessage}`,
          activityType: 'stream_refresh_activity',
          actorType: 'employee',
          actorAddress: signer.address,
          streamId: variables?.streamId,
          status,
          errorMessage: cancelled ? undefined : errorMessage,
          metadata: {
            streamAddress: variables?.streamAddress ? String(variables.streamAddress) : (variables?.streamId ?? null),
            actor: 'employee',
            visibleToEmployer: true,
          },
        });
      } catch (activityError) {
        console.error('[refresh-activity] Failed to log employer-facing refresh error activity', activityError);
      }
    },
  });
}
