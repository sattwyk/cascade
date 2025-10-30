import { useQuery } from '@tanstack/react-query';
import type { Address } from 'gill';

import { useSolana } from '@/components/solana/use-solana';

import { useGetBalanceQueryKey } from './use-get-balance-query-key';

export function useGetBalanceQuery({ address, enabled = true }: { address: Address; enabled?: boolean }) {
  const { client } = useSolana();

  return useQuery({
    retry: false,
    queryKey: useGetBalanceQueryKey({ address }),
    queryFn: () => client.rpc.getBalance(address).send(),
    enabled,
  });
}
