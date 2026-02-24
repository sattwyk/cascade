import { ReactNode, useEffect, useRef } from 'react';

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

const isDevelopment = process.env.NODE_ENV === 'development';
const clusters = isDevelopment
  ? [createSolanaLocalnet(), createSolanaDevnet()]
  : [createSolanaDevnet(), createSolanaLocalnet()];
const developmentDefaultClusterId: SolanaClusterId = 'solana:localnet';
const walletUiClusterStorageKey = 'wallet-ui:cluster';

const config = createWalletUiConfig({
  clusters,
});

solanaMobileWalletAdapter({ clusters: config.clusters });

function WalletClusterGuard() {
  const { account } = useWalletUi();
  const { cluster, clusters, setCluster } = useWalletUiCluster();
  const checkedDevelopmentDefaultRef = useRef(false);

  useEffect(() => {
    if (isDevelopment && !checkedDevelopmentDefaultRef.current && typeof window !== 'undefined') {
      checkedDevelopmentDefaultRef.current = true;
      let hasPersistedClusterSelection = false;
      try {
        hasPersistedClusterSelection = window.localStorage.getItem(walletUiClusterStorageKey) !== null;
      } catch {
        hasPersistedClusterSelection = false;
      }

      if (!hasPersistedClusterSelection && cluster.id !== developmentDefaultClusterId) {
        setCluster(developmentDefaultClusterId);
        return;
      }
    }

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
