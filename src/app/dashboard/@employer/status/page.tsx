import { employerDashboardStatusViewFlag } from '@/core/config/flags';
import { DashboardFeatureFlagDisabled } from '@/core/ui/feature-flag-disabled';
import { StatusTab } from '@/features/organization/components/status-tab';

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
