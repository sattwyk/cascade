'use client';

import { useCallback } from 'react';

import { Wallet } from 'lucide-react';
import { toast } from 'sonner';

import { useSolana } from '@/components/solana/use-solana';
import { Button } from '@/components/ui/button';
import { ellipsify } from '@/lib/utils';

export function WalletBanner() {
  const { account, connected, disconnect } = useSolana();
  const walletAddress = account?.address;
  const displayAddress = walletAddress ? ellipsify(walletAddress, 6) : 'No wallet connected';

  const handleDisconnect = useCallback(async () => {
    if (!connected) return;
    try {
      await Promise.resolve(disconnect());
      toast.success('Wallet disconnected');
    } catch (error) {
      console.error('Failed to disconnect wallet', error);
      toast.error('Failed to disconnect wallet');
    }
  }, [connected, disconnect]);

  return (
    <div className="border-b border-border bg-muted/50 px-6 py-3 md:px-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Wallet className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{displayAddress}</span>
        </div>
        <Button size="sm" variant="outline" onClick={handleDisconnect} disabled={!connected}>
          Disconnect
        </Button>
      </div>
    </div>
  );
}
