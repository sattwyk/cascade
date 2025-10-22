import { AppAlert } from '@/components/app-alert';
import { useSolana } from '@/components/solana/use-solana';

import { usePaymentStreamQuery } from '../data-access/use-payment-stream-query';

export function CascadeUiProgram({ employee }: { employee?: string } = {}) {
  const { account, cluster } = useSolana();
  const employer = account?.address;
  const streamQuery = usePaymentStreamQuery({ employer, employee });

  if (!employer) {
    return null;
  }

  if (!employee) {
    return <AppAlert>Select an employee address to load their payment stream.</AppAlert>;
  }

  if (streamQuery.isLoading) {
    return <span className="loading loading-spinner loading-lg"></span>;
  }

  const streamAccount = streamQuery.data;

  if (!streamAccount || !('exists' in streamAccount) || !streamAccount.exists) {
    return (
      <AppAlert>
        Stream account not found on {cluster.label}. Create a stream or verify the provided addresses.
      </AppAlert>
    );
  }

  return (
    <div className="space-y-6">
      <pre>{JSON.stringify(streamAccount.data, null, 2)}</pre>
    </div>
  );
}
