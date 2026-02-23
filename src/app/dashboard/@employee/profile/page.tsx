import { employeeDashboardProfileViewFlag } from '@/core/config/flags';
import { DashboardFeatureFlagDisabled } from '@/core/ui/feature-flag-disabled';

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
