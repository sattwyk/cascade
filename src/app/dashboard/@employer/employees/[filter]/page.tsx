import { employerDashboardEmployeesViewFlag } from '@/core/config/flags';
import { DashboardFeatureFlagDisabled } from '@/core/ui/feature-flag-disabled';
import { EmployeesTab } from '@/features/employees/components/employees-tab';
import { getEmployeesForDashboard } from '@/features/employees/server/queries/employees';

const EMPLOYEE_FILTER_MAP: Record<string, string> = {
  all: 'directory',
  directory: 'directory',
  ready: 'directory',
  invited: 'invitations',
  invitations: 'invitations',
  archived: 'archived',
};

export default async function DashboardEmployeesFilterPage({ params }: { params: Promise<{ filter: string }> }) {
  if (!(await employerDashboardEmployeesViewFlag())) {
    return (
      <DashboardFeatureFlagDisabled
        title="Employees"
        description="Enable `dashboard_employer_employees_view` to access this employer dashboard page."
      />
    );
  }

  const { filter } = await params;
  const rawFilter = filter?.toLowerCase();
  const resolvedFilter = EMPLOYEE_FILTER_MAP[rawFilter] ?? 'directory';

  const employees = await getEmployeesForDashboard();

  return <EmployeesTab filterState={resolvedFilter} employees={employees} />;
}
