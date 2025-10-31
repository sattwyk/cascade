import { useQueryClient } from '@tanstack/react-query';

import { DASHBOARD_STREAMS_QUERY_KEY } from './use-dashboard-streams-query';

export function useInvalidateDashboardStreamsQuery() {
  const queryClient = useQueryClient();

  return () => {
    return queryClient.invalidateQueries({ queryKey: DASHBOARD_STREAMS_QUERY_KEY });
  };
}
