import { useQuery } from '@tanstack/react-query';

import { getStreamActivity, type StreamActivity } from '@/app/dashboard/actions/stream-activity';

type UseStreamActivityQueryOptions = {
  streamId: string;
  enabled?: boolean;
};

export function useStreamActivityQuery({ streamId, enabled = true }: UseStreamActivityQueryOptions) {
  return useQuery<StreamActivity[]>({
    queryKey: ['stream-activity', streamId],
    queryFn: () => getStreamActivity(streamId),
    enabled: enabled && !!streamId,
    staleTime: 30_000, // Consider data stale after 30 seconds
    refetchInterval: 60_000, // Auto-refetch every minute
  });
}
