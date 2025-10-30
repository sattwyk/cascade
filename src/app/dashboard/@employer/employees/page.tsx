import { getEmployeesForDashboard } from '@/app/dashboard/data/employees';
import { EmployeesTab } from '@/components/dashboard/tabs/employees-tab';

export default async function DashboardEmployeesPage() {
  const employees = await getEmployeesForDashboard();
  return <EmployeesTab filterState="directory" employees={employees} />;
}
