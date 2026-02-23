import { useQuery } from '@tanstack/react-query';

import { getAuditTrail, type AuditTrailEntry } from '@/features/organization/server/actions/get-audit-trail';

type UseDashboardAuditTrailQueryOptions = {
  organizationId: string;
  limit?: number;
  enabled?: boolean;
  initialData?: AuditTrailEntry[];
};

export function useDashboardAuditTrailQuery({
  organizationId,
  limit = 100,
  enabled = true,
  initialData,
}: UseDashboardAuditTrailQueryOptions) {
  return useQuery<AuditTrailEntry[]>({
    queryKey: ['dashboard-audit-trail', organizationId, limit],
    queryFn: async () => {
      const result = await getAuditTrail(organizationId, { limit });
      return result.entries;
    },
    enabled: Boolean(organizationId) && enabled,
    initialData,
    staleTime: 30_000,
  });
}
