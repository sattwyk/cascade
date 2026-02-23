import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { acknowledgeAlert, dismissAlert, resolveAlert } from '@/features/alerts/server/actions/alerts';

import { useInvalidateDashboardAlertsQuery } from '../queries/use-invalidate-dashboard-alerts-query';

export function useAcknowledgeAlertMutation() {
  const invalidateAlerts = useInvalidateDashboardAlertsQuery();

  return useMutation({
    mutationFn: (alertId: string) => acknowledgeAlert(alertId),
    onSuccess: () => {
      invalidateAlerts();
      toast.success('Alert acknowledged');
    },
    onError: () => {
      toast.error('Failed to acknowledge alert');
    },
  });
}

export function useResolveAlertMutation() {
  const invalidateAlerts = useInvalidateDashboardAlertsQuery();

  return useMutation({
    mutationFn: (alertId: string) => resolveAlert(alertId),
    onSuccess: () => {
      invalidateAlerts();
      toast.success('Alert resolved');
    },
    onError: () => {
      toast.error('Failed to resolve alert');
    },
  });
}

export function useDismissAlertMutation() {
  const invalidateAlerts = useInvalidateDashboardAlertsQuery();

  return useMutation({
    mutationFn: (alertId: string) => dismissAlert(alertId),
    onSuccess: () => {
      invalidateAlerts();
      toast.success('Alert dismissed');
    },
    onError: () => {
      toast.error('Failed to dismiss alert');
    },
  });
}
