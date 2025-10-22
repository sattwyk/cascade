import { useQuery } from '@tanstack/react-query';

import { CASCADE_PROGRAM_ADDRESS } from '@project/anchor';

import { useSolana } from '@/components/solana/use-solana';

export function useGetProgramAccountQuery() {
  const { client, cluster } = useSolana();

  return useQuery({
    queryKey: ['get-program-account', { cluster }],
    queryFn: () => client.rpc.getAccountInfo(CASCADE_PROGRAM_ADDRESS).send(),
  });
}
