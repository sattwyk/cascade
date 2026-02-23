import { employerDashboardContactViewFlag } from '@/core/config/flags';
import { DashboardFeatureFlagDisabled } from '@/core/ui/feature-flag-disabled';
import { ContactTab } from '@/features/organization/components/contact-tab';

export default async function DashboardContactPage() {
  if (!(await employerDashboardContactViewFlag())) {
    return (
      <DashboardFeatureFlagDisabled
        title="Contact"
        description="Enable `dashboard_employer_contact_view` to access this employer dashboard page."
      />
    );
  }

  return <ContactTab />;
}
