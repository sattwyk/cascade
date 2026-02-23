import { employerDashboardAuditViewFlag } from '@/core/config/flags';
import { DashboardFeatureFlagDisabled } from '@/core/ui/feature-flag-disabled';
import { AuditTrailTab } from '@/features/organization/components/audit-trail-tab';
import { getAuditTrail } from '@/features/organization/server/actions/get-audit-trail';
import { resolveOrganizationContext } from '@/features/organization/server/actions/organization-context';

export default async function DashboardAuditPage() {
  if (!(await employerDashboardAuditViewFlag())) {
    return (
      <DashboardFeatureFlagDisabled
        title="Audit Trail"
        description="Enable `dashboard_employer_audit_view` to access this employer dashboard page."
      />
    );
  }

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
