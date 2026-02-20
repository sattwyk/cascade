import { DashboardFeatureFlagDisabled } from '@/components/dashboard/feature-flag-disabled';
import { SettingsTab } from '@/components/dashboard/tabs/settings-tab';
import { employerDashboardSettingsViewFlag } from '@/flags';

export default async function DashboardSettingsPage() {
  if (!(await employerDashboardSettingsViewFlag())) {
    return (
      <DashboardFeatureFlagDisabled
        title="Settings"
        description="Enable `dashboard_employer_settings_view` to access this employer dashboard page."
      />
    );
  }

  return <SettingsTab />;
}
