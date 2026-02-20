import { DashboardFeatureFlagDisabled } from '@/components/dashboard/feature-flag-disabled';
import { TokenAccountsTab } from '@/components/dashboard/tabs/token-accounts-tab';
import { employerDashboardTokenAccountsViewFlag } from '@/flags';

export default async function DashboardTokenAccountsPage() {
  if (!(await employerDashboardTokenAccountsViewFlag())) {
    return (
      <DashboardFeatureFlagDisabled
        title="Token Accounts"
        description="Enable `dashboard_employer_token_accounts_view` to access this employer dashboard page."
      />
    );
  }

  return <TokenAccountsTab />;
}
