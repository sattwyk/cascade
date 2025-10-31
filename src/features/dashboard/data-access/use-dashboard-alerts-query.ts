import { useQuery } from '@tanstack/react-query';

import { getDashboardAlerts, type DashboardAlert } from '@/app/dashboard/actions/alerts';

export function useDashboardAlertsQuery(options?: {
  status?: 'open' | 'acknowledged' | 'resolved' | 'dismissed' | 'all';
  initialData?: DashboardAlert[];
}) {
  return useQuery({
    queryKey: ['dashboard-alerts', options?.status ?? 'active'],
    queryFn: () => getDashboardAlerts({ status: options?.status }),
    initialData: options?.initialData,
    staleTime: 30_000, // 30 seconds
    refetchInterval: 60_000, // Refetch every minute
  });
}
