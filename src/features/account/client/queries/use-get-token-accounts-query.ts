import { useQuery } from '@tanstack/react-query';
import type { Address } from 'gill';
import { TOKEN_2022_PROGRAM_ADDRESS, TOKEN_PROGRAM_ADDRESS } from 'gill/programs/token';

import { useSolana } from '@/components/solana/use-solana';

import { getTokenAccountsByOwner } from '../utils/get-token-accounts-by-owner';

export function useGetTokenAccountsQuery({ address, enabled = true }: { address: Address; enabled?: boolean }) {
  const { client, cluster } = useSolana();

  return useQuery({
    queryKey: ['get-token-accounts', { cluster, address }],
    queryFn: async () =>
      Promise.all([
        getTokenAccountsByOwner(client.rpc, { address, programId: TOKEN_PROGRAM_ADDRESS }),
        getTokenAccountsByOwner(client.rpc, { address, programId: TOKEN_2022_PROGRAM_ADDRESS }),
      ]).then(([tokenAccounts, token2022Accounts]) => [...tokenAccounts, ...token2022Accounts]),
    enabled,
  });
}
