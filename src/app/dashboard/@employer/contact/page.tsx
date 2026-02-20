import { DashboardFeatureFlagDisabled } from '@/components/dashboard/feature-flag-disabled';
import { ContactTab } from '@/components/dashboard/tabs/contact-tab';
import { employerDashboardContactViewFlag } from '@/flags';

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
