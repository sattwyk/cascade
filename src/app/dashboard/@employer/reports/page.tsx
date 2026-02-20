import { DashboardFeatureFlagDisabled } from '@/components/dashboard/feature-flag-disabled';
import { ReportsTab } from '@/components/dashboard/tabs/reports-tab';
import { employerDashboardReportsViewFlag } from '@/flags';

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
