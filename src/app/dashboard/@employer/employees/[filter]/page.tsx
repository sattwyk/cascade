import { getEmployeesForDashboard } from '@/app/dashboard/data/employees';
import { EmployeesTab } from '@/components/dashboard/tabs/employees-tab';

const EMPLOYEE_FILTER_MAP: Record<string, string> = {
  all: 'directory',
  directory: 'directory',
  ready: 'directory',
  invited: 'invitations',
  invitations: 'invitations',
  archived: 'archived',
};

export default async function DashboardEmployeesFilterPage({ params }: { params: Promise<{ filter: string }> }) {
  const { filter } = await params;
  const rawFilter = filter?.toLowerCase();
  const resolvedFilter = EMPLOYEE_FILTER_MAP[rawFilter] ?? 'directory';

  const employees = await getEmployeesForDashboard();

  return <EmployeesTab filterState={resolvedFilter} employees={employees} />;
}
