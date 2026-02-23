import { DashboardFeatureFlagDisabled } from '@/components/dashboard/feature-flag-disabled';
import { employerDashboardReportsViewFlag } from '@/core/config/flags';
import { ReportsTab } from '@/features/organization/components/reports-tab';

export default async function DashboardReportsPage() {
  if (!(await employerDashboardReportsViewFlag())) {
    return (
      <DashboardFeatureFlagDisabled
        title="Reports"
        description="Enable `dashboard_employer_reports_view` to access this employer dashboard page."
      />
    );
  }

  return <ReportsTab />;
}
