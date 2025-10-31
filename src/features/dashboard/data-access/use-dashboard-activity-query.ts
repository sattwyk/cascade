import { useQuery } from '@tanstack/react-query';

import { getActivityLog, type ActivityLogEntry } from '@/app/dashboard/actions/activity-log';

type UseDashboardActivityQueryOptions = {
  limit?: number;
  enabled?: boolean;
  initialData?: ActivityLogEntry[];
};

export function useDashboardActivityQuery({
  limit = 10,
  enabled = true,
  initialData,
}: UseDashboardActivityQueryOptions = {}) {
  return useQuery<ActivityLogEntry[]>({
    queryKey: ['dashboard-activity', limit],
    queryFn: () => getActivityLog({ limit }),
    initialData,
    enabled,
  });
}
