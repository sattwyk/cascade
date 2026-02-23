import { employerDashboardHelpViewFlag } from '@/core/config/flags';
import { DashboardFeatureFlagDisabled } from '@/core/ui/feature-flag-disabled';
import { HelpTab } from '@/features/organization/components/help-tab';

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
