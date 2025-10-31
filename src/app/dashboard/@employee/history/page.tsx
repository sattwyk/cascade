import { getEmployeeWithdrawalHistory } from '@/app/dashboard/@employee/actions/withdrawal-history';

import { EmployeeHistoryContent } from './employee-history-content';

export default async function EmployeeHistoryPage() {
  const initialData = await getEmployeeWithdrawalHistory();
  return <EmployeeHistoryContent initialData={initialData} />;
}
