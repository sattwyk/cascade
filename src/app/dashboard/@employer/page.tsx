import { getActivityLog } from '@/app/dashboard/actions/activity-log';
import { resolveOrganizationContext } from '@/app/dashboard/actions/organization-context';
import { getStreamsForDashboard } from '@/app/dashboard/data/streams';
import { DashboardFeatureFlagDisabled } from '@/components/dashboard/feature-flag-disabled';
import { OverviewTab } from '@/components/dashboard/tabs/overview-tab';
import { employerDashboardOverviewViewFlag } from '@/flags';

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
