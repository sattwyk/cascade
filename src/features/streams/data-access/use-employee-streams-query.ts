import { useQuery } from '@tanstack/react-query';

import { getEmployeeStreams, type EmployeeStreamSummary } from '@/app/dashboard/actions/employee-streams';

interface UseEmployeeStreamsQueryProps {
  employeeId?: string | null;
  enabled?: boolean;
}

export type { EmployeeStreamSummary } from '@/app/dashboard/actions/employee-streams';

export function useEmployeeStreamsQuery({ employeeId, enabled = true }: UseEmployeeStreamsQueryProps) {
  return useQuery<EmployeeStreamSummary[]>({
    enabled: Boolean(employeeId) && enabled,
    queryKey: ['payment-stream', 'employee-streams', employeeId],
    queryFn: async () => {
      if (!employeeId) {
        return [];
      }

      const result = await getEmployeeStreams({ employeeId });
      if (!result.ok) {
        throw new Error(result.error ?? 'Failed to load streams.');
      }

      return result.streams;
    },
  });
}
