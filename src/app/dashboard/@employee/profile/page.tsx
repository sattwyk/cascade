import { DashboardFeatureFlagDisabled } from '@/components/dashboard/feature-flag-disabled';
import { employeeDashboardProfileViewFlag } from '@/flags';

import EmployeeProfilePageClient from './profile-page-client';

export default async function EmployeeProfilePage() {
  if (!(await employeeDashboardProfileViewFlag())) {
    return (
      <DashboardFeatureFlagDisabled
        title="Profile"
        description="Enable `dashboard_employee_profile_view` to access this employee dashboard page."
      />
    );
  }

  return <EmployeeProfilePageClient />;
}
