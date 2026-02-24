import { employerDashboardSettingsViewFlag } from '@/core/config/flags';
import { DashboardFeatureFlagDisabled } from '@/core/ui/feature-flag-disabled';
import { SettingsTab } from '@/features/organization/components/settings-tab';

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
