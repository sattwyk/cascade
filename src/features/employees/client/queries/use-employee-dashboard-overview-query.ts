import { useQuery } from '@tanstack/react-query';

import {
  getEmployeeDashboardOverview,
  type EmployeeDashboardOverview,
} from '@/features/employees/server/actions/overview';

export const EMPLOYEE_DASHBOARD_OVERVIEW_QUERY_KEY = ['employee-dashboard', 'overview'] as const;

export function useEmployeeDashboardOverviewQuery(options?: { initialData?: EmployeeDashboardOverview }) {
  return useQuery({
    queryKey: EMPLOYEE_DASHBOARD_OVERVIEW_QUERY_KEY,
    queryFn: getEmployeeDashboardOverview,
    initialData: options?.initialData,
  });
}
