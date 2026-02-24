import { employerDashboardEmployeesViewFlag } from '@/core/config/flags';
import { DashboardFeatureFlagDisabled } from '@/core/ui/feature-flag-disabled';
import { EmployeesTab } from '@/features/employees/components/employer-employees-tab';
import { getEmployeesForDashboard } from '@/features/employees/server/queries/employer-list-employees';

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
