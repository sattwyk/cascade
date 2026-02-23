import { employeeDashboardStreamsViewFlag } from '@/core/config/flags';
import { DashboardFeatureFlagDisabled } from '@/core/ui/feature-flag-disabled';

import EmployeeStreamsPageClient from './streams-page-client';

export default async function EmployeeStreamsPage() {
  if (!(await employeeDashboardStreamsViewFlag())) {
    return (
      <DashboardFeatureFlagDisabled
        title="My Streams"
        description="Enable `dashboard_employee_streams_view` to access this employee dashboard page."
      />
    );
  }

  return <EmployeeStreamsPageClient />;
}
