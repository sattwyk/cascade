import { DashboardFeatureFlagDisabled } from '@/components/dashboard/feature-flag-disabled';
import { employerDashboardEmployeesViewFlag } from '@/core/config/flags';
import { EmployeesTab } from '@/features/employees/components/employees-tab';
import { getEmployeesForDashboard } from '@/features/employees/server/queries/employees';

export default async function DashboardEmployeesPage() {
  if (!(await employerDashboardEmployeesViewFlag())) {
    return (
      <DashboardFeatureFlagDisabled
        title="Employees"
        description="Enable `dashboard_employer_employees_view` to access this employer dashboard page."
      />
    );
  }

  const employees = await getEmployeesForDashboard();
  return <EmployeesTab filterState="directory" employees={employees} />;
}
