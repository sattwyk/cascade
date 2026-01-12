import { getExplorerLink, GetExplorerLinkArgs, SolanaClusterMoniker } from 'gill';
import { ArrowUpRightFromSquare } from 'lucide-react';

import { useSolana } from '@/components/solana/use-solana';

export function AppExplorerLink({
  className,
  label = '',
  ...link
}: GetExplorerLinkArgs & {
  className?: string;
  label: string;
}) {
  const { cluster } = useSolana();
  // cluster.id is in format "solana:devnet", extract the moniker part
  const clusterMoniker = cluster.id.replace('solana:', '') as SolanaClusterMoniker;
  return (
    <a
      href={getExplorerLink({ ...link, cluster: clusterMoniker })}
      target="_blank"
      rel="noopener noreferrer"
      className={className ? className : `link inline-flex gap-1 font-mono`}
    >
      {label}
      <ArrowUpRightFromSquare size={12} />
    </a>
  );
}
