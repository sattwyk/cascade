import { useQueryClient } from '@tanstack/react-query';

export function useInvalidateDashboardEmployeesQuery() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['dashboard-employees'] });
  };
}
