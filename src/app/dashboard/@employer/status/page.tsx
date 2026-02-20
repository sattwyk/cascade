import { DashboardFeatureFlagDisabled } from '@/components/dashboard/feature-flag-disabled';
import { StatusTab } from '@/components/dashboard/tabs/status-tab';
import { employerDashboardStatusViewFlag } from '@/flags';

export default async function DashboardStatusPage() {
  if (!(await employerDashboardStatusViewFlag())) {
    return (
      <DashboardFeatureFlagDisabled
        title="Status"
        description="Enable `dashboard_employer_status_view` to access this employer dashboard page."
      />
    );
  }

  return <StatusTab />;
}
