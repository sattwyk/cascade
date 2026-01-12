import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Address } from 'gill';

import { requestDevTokenTopUp } from '@/app/dashboard/actions/request-dev-token-top-up';
import { toastTx } from '@/components/toast-tx';

type SupportedToken = 'USDC' | 'USDT' | 'EURC';
type ClusterMoniker = 'devnet' | 'localnet';

type MutationArgs = {
  amount: number;
  token: SupportedToken;
  cluster: ClusterMoniker;
};

export function useRequestDevTokenTopUpMutation({ address }: { address: Address }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ amount, token, cluster }: MutationArgs) => {
      const result = await requestDevTokenTopUp({ amount, token, recipient: address, cluster });
      if (!result.ok) {
        const error = new Error(result.message);
        (error as Error & { code?: string; cause?: string }).code = result.error;
        (error as Error & { code?: string; cause?: string }).cause = result.cause;
        throw error;
      }
      return result;
    },
    onSuccess: async (result) => {
      toastTx(result.signature, `Minted ${result.amount} ${result.token}`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['get-token-accounts'] }),
        queryClient.invalidateQueries({ queryKey: ['payment-stream'] }),
      ]);
    },
  });
}
