import { useQuery } from '@tanstack/react-query';

import { getDashboardStreams } from '@/features/streams/server/actions/employer-streams';
import type { DashboardStream } from '@/types/stream';

export const DASHBOARD_STREAMS_QUERY_KEY = ['dashboard-streams'] as const;

export function useDashboardStreamsQuery({ initialData }: { initialData?: DashboardStream[] }) {
  return useQuery({
    queryKey: DASHBOARD_STREAMS_QUERY_KEY,
    queryFn: getDashboardStreams,
    initialData,
  });
}
