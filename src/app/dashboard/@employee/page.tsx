import { getEmployeeDashboardOverview } from '@/app/dashboard/@employee/actions/overview';
import { EmployeeDashboardOverview } from '@/components/employee-dashboard/employee-dashboard-overview';

export default async function EmployeeOverviewPage() {
  const initialData = await getEmployeeDashboardOverview();
  return <EmployeeDashboardOverview initialData={initialData} />;
}
