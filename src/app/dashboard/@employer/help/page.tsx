import { DashboardFeatureFlagDisabled } from '@/components/dashboard/feature-flag-disabled';
import { HelpTab } from '@/components/dashboard/tabs/help-tab';
import { employerDashboardHelpViewFlag } from '@/core/config/flags';

export default async function DashboardHelpPage() {
  if (!(await employerDashboardHelpViewFlag())) {
    return (
      <DashboardFeatureFlagDisabled
        title="Help"
        description="Enable `dashboard_employer_help_view` to access this employer dashboard page."
      />
    );
  }

  return <HelpTab />;
}
