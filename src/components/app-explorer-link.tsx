import { getSolanaClusterMoniker } from '@wallet-ui/react-gill';
import { getExplorerLink, GetExplorerLinkArgs } from 'gill';
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
  return (
    <a
      href={getExplorerLink({ ...link, cluster: getSolanaClusterMoniker(cluster.id) })}
      target="_blank"
      rel="noopener noreferrer"
      className={className ? className : `link inline-flex gap-1 font-mono`}
    >
      {label}
      <ArrowUpRightFromSquare size={12} />
    </a>
  );
}
