import { DashboardFeatureFlagDisabled } from '@/components/dashboard/feature-flag-disabled';
import { employeeDashboardOverviewViewFlag } from '@/core/config/flags';
import { EmployeeDashboardOverview } from '@/features/employees/components/employee-dashboard-overview';
import { getEmployeeDashboardOverview } from '@/features/employees/server/actions/overview';

export default async function EmployeeOverviewPage() {
  if (!(await employeeDashboardOverviewViewFlag())) {
    return (
      <DashboardFeatureFlagDisabled
        title="Employee Dashboard"
        description="Enable `dashboard_employee_overview_view` to access this employee dashboard page."
      />
    );
  }

  const initialData = await getEmployeeDashboardOverview();
  return <EmployeeDashboardOverview initialData={initialData} />;
}
