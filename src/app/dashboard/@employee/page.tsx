import { getEmployeeDashboardOverview } from '@/app/dashboard/@employee/actions/overview';
import { DashboardFeatureFlagDisabled } from '@/components/dashboard/feature-flag-disabled';
import { EmployeeDashboardOverview } from '@/components/employee-dashboard/employee-dashboard-overview';
import { employeeDashboardOverviewViewFlag } from '@/flags';

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
