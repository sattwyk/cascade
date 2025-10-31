import { useQuery } from '@tanstack/react-query';

import { getNotificationCounts, type NotificationCounts } from '@/app/dashboard/actions/notification-counts';

export const NOTIFICATION_COUNTS_QUERY_KEY = ['notification-counts'] as const;

/**
 * Query hook to fetch notification counts for the sidebar
 * Refetches every 30 seconds to keep counts fresh
 */
export function useNotificationCountsQuery() {
  return useQuery<NotificationCounts>({
    queryKey: NOTIFICATION_COUNTS_QUERY_KEY,
    queryFn: getNotificationCounts,
    refetchInterval: 30_000, // Refetch every 30 seconds
    staleTime: 20_000, // Consider stale after 20 seconds
  });
}
