import { employerDashboardOverviewViewFlag } from '@/core/config/flags';
import { DashboardFeatureFlagDisabled } from '@/core/ui/feature-flag-disabled';
import { OverviewTab } from '@/features/organization/components/overview-tab';
import { getActivityLog } from '@/features/organization/server/actions/activity-log';
import { resolveOrganizationContext } from '@/features/organization/server/actions/organization-context';
import { getStreamsForDashboard } from '@/features/streams/server/queries/streams';

export default async function DashboardOverviewPage() {
  if (!(await employerDashboardOverviewViewFlag())) {
    return (
      <DashboardFeatureFlagDisabled
        title="Overview"
        description="Enable `dashboard_employer_overview_view` to access this employer dashboard page."
      />
    );
  }

  const organizationContext = await resolveOrganizationContext();
  if (organizationContext.status !== 'ok') {
    return <OverviewTab initialStreams={[]} initialActivity={[]} />;
  }

  const organizationId = organizationContext.organizationId;
  const [streams, activity] = await Promise.all([
    getStreamsForDashboard(organizationId),
    getActivityLog({ limit: 10, organizationId }),
  ]);

  return <OverviewTab initialStreams={streams} initialActivity={activity} />;
}
