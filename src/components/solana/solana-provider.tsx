import { ReactNode, useEffect } from 'react';

import {
  createSolanaDevnet,
  createSolanaLocalnet,
  createWalletUiConfig,
  SolanaClusterId,
  useWalletUi,
  useWalletUiCluster,
  WalletUi,
} from '@wallet-ui/react';
import { WalletUiGillProvider } from '@wallet-ui/react-gill';

import { solanaMobileWalletAdapter } from './solana-mobile-wallet-adapter';

const config = createWalletUiConfig({
  clusters: [createSolanaDevnet(), createSolanaLocalnet()],
});

solanaMobileWalletAdapter({ clusters: config.clusters });

function WalletClusterGuard() {
  const { account } = useWalletUi();
  const { cluster, clusters, setCluster } = useWalletUiCluster();

  useEffect(() => {
    const walletChains = account?.chains ?? [];
    if (walletChains.length === 0) return;

    if (walletChains.includes(cluster.id)) {
      return;
    }

    const supportedChain = walletChains.find((chain) => clusters.some((entry) => entry.id === chain));
    if (!supportedChain) {
      return;
    }

    setCluster(supportedChain as SolanaClusterId);
  }, [account?.chains, cluster.id, clusters, setCluster]);

  return null;
}

export function SolanaProvider({ children }: { children: ReactNode }) {
  return (
    <WalletUi config={config}>
      <WalletUiGillProvider>
        <WalletClusterGuard />
        {children}
      </WalletUiGillProvider>
    </WalletUi>
  );
}
