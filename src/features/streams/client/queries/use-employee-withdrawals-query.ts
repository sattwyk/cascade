import { useQuery } from '@tanstack/react-query';

import {
  getEmployeeWithdrawalHistory,
  type EmployeeWithdrawal,
} from '@/features/streams/server/actions/employee-withdrawal-history';

export const EMPLOYEE_WITHDRAWALS_QUERY_KEY = ['employee-dashboard', 'withdrawals'] as const;

export function useEmployeeWithdrawalsQuery(options?: { initialData?: EmployeeWithdrawal[] }) {
  return useQuery({
    queryKey: EMPLOYEE_WITHDRAWALS_QUERY_KEY,
    queryFn: getEmployeeWithdrawalHistory,
    initialData: options?.initialData,
  });
}
