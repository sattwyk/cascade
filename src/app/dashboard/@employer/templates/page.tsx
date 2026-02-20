import { DashboardFeatureFlagDisabled } from '@/components/dashboard/feature-flag-disabled';
import { TemplatesTab } from '@/components/dashboard/tabs/templates-tab';
import { employerDashboardTemplatesViewFlag } from '@/flags';

export default async function DashboardTemplatesPage() {
  if (!(await employerDashboardTemplatesViewFlag())) {
    return (
      <DashboardFeatureFlagDisabled
        title="Templates"
        description="Enable `dashboard_employer_templates_view` to access this employer dashboard page."
      />
    );
  }

  return <TemplatesTab />;
}
