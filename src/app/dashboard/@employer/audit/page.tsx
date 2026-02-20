import { resolveOrganizationContext } from '@/app/dashboard/actions/organization-context';
import { DashboardFeatureFlagDisabled } from '@/components/dashboard/feature-flag-disabled';
import { AuditTrailTab } from '@/components/dashboard/tabs/audit-trail-tab';
import { getAuditTrail } from '@/features/dashboard/actions/get-audit-trail';
import { employerDashboardAuditViewFlag } from '@/flags';

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
