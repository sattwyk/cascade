import { DashboardFeatureFlagDisabled } from '@/components/dashboard/feature-flag-disabled';
import { employerDashboardTemplatesViewFlag } from '@/core/config/flags';
import { TemplatesTab } from '@/features/streams/components/templates-tab';

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
