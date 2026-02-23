import { DashboardFeatureFlagDisabled } from '@/components/dashboard/feature-flag-disabled';
import { employeeDashboardHistoryViewFlag } from '@/core/config/flags';
import { getEmployeeWithdrawalHistory } from '@/features/streams/server/actions/withdrawal-history';

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
