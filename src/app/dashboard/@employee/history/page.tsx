import { getEmployeeWithdrawalHistory } from '@/app/dashboard/@employee/actions/withdrawal-history';
import { DashboardFeatureFlagDisabled } from '@/components/dashboard/feature-flag-disabled';
import { employeeDashboardHistoryViewFlag } from '@/flags';

import { EmployeeHistoryContent } from './employee-history-content';

export default async function EmployeeHistoryPage() {
  if (!(await employeeDashboardHistoryViewFlag())) {
    return (
      <DashboardFeatureFlagDisabled
        title="Payment History"
        description="Enable `dashboard_employee_history_view` to access this employee dashboard page."
      />
    );
  }

  const initialData = await getEmployeeWithdrawalHistory();
  return <EmployeeHistoryContent initialData={initialData} />;
}
