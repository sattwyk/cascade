import { useCallback } from 'react';

import { useQueryClient } from '@tanstack/react-query';

export function useInvalidateDashboardAlertsQuery() {
  const queryClient = useQueryClient();

  return useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['dashboard-alerts'] });
  }, [queryClient]);
}
