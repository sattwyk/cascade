import { employerDashboardTokenAccountsViewFlag } from '@/core/config/flags';
import { DashboardFeatureFlagDisabled } from '@/core/ui/feature-flag-disabled';
import { TokenAccountsTab } from '@/features/account/components/token-accounts-tab';

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
