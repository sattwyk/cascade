import { resolveOrganizationContext } from '@/app/dashboard/actions/organization-context';
import { AuditTrailTab } from '@/components/dashboard/tabs/audit-trail-tab';
import { getAuditTrail } from '@/features/dashboard/actions/get-audit-trail';

export default async function DashboardAuditPage() {
  const organizationContext = await resolveOrganizationContext();
  const organizationId = organizationContext.status === 'ok' ? organizationContext.organizationId : null;

  if (!organizationId) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Organization not found</p>
      </div>
    );
  }

  const { entries } = await getAuditTrail(organizationId, { limit: 100 });

  return <AuditTrailTab organizationId={organizationId} initialEntries={entries} />;
}
