import { useQuery } from '@tanstack/react-query';

import { listDashboardEmployees } from '@/features/employees/server/actions/employees';
import type { EmployeeSummary } from '@/types/employee';

export function useDashboardEmployeesQuery({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery<EmployeeSummary[]>({
    queryKey: ['dashboard-employees'],
    queryFn: async () => {
      const result = await listDashboardEmployees();
      if (!result.ok) {
        throw new Error(result.error || 'Failed to load employees');
      }

      return result.data ?? [];
    },
    enabled,
    refetchOnMount: 'always',
  });
}
