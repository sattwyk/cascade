import { getEmployeesForDashboard } from '@/app/dashboard/data/employees';
import { DashboardFeatureFlagDisabled } from '@/components/dashboard/feature-flag-disabled';
import { EmployeesTab } from '@/components/dashboard/tabs/employees-tab';
import { employerDashboardEmployeesViewFlag } from '@/flags';

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
