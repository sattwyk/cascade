import { employeeDashboardHistoryViewFlag } from '@/core/config/flags';
import { DashboardFeatureFlagDisabled } from '@/core/ui/feature-flag-disabled';
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
