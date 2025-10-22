import { useQuery } from '@tanstack/react-query';

import { fetchMaybePaymentStream } from '@project/anchor';

import { useSolana } from '@/components/solana/use-solana';

import { derivePaymentStream } from './derive-cascade-pdas';

type UsePaymentStreamQueryProps = {
  employer?: string;
  employee?: string;
};

export function usePaymentStreamQuery({ employer, employee }: UsePaymentStreamQueryProps) {
  const { client, cluster } = useSolana();

  return useQuery({
    enabled: Boolean(employer && employee),
    queryKey: ['payment-stream', { cluster, employer, employee }],
    queryFn: async () => {
      const [streamAddress] = await derivePaymentStream(employer!, employee!);
      return fetchMaybePaymentStream(client.rpc, streamAddress);
    },
    staleTime: 30_000, // Consider data stale after 30 seconds
    refetchInterval: 60_000, // Auto-refetch every minute for real-time updates
  });
}
