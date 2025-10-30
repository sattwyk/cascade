import { memo, useCallback } from 'react';

import { UiWallet, useWalletUiWallet } from '@wallet-ui/react';
import { toast } from 'sonner';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { cn } from '@/lib/utils';

type WalletOptionButtonProps = {
  wallet: UiWallet;
  isActive: boolean;
  onConnected: () => void;
};

export const WalletOptionButton = memo(function WalletOptionButton({
  wallet,
  isActive,
  onConnected,
}: WalletOptionButtonProps) {
  const { connect, isConnecting } = useWalletUiWallet({ wallet });

  const handleSelect = useCallback(async () => {
    if (isActive) return;
    try {
      await connect();
      onConnected();
    } catch (error) {
      console.error('[wallet-picker] Failed to connect wallet', error);
      toast.error('Failed to connect wallet', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    }
  }, [connect, isActive, onConnected]);

  return (
    <Button
      type="button"
      variant={isActive ? 'secondary' : 'outline'}
      className={cn(
        'w-full justify-start gap-3 bg-card text-left hover:bg-muted',
        isActive && 'border-primary bg-primary/10 text-primary hover:bg-primary/10',
      )}
      onClick={handleSelect}
      disabled={isConnecting || isActive}
    >
      <Avatar className="h-8 w-8 shrink-0 rounded-md p-1">
        <AvatarImage src={wallet.icon} alt={wallet.name} />
        <AvatarFallback>{wallet.name[0]}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col items-start">
        <span className="text-sm font-medium">
          {wallet.name}
          {isActive ? <span className="ml-2 text-xs font-semibold text-primary">Connected</span> : null}
        </span>
        {!isActive && isConnecting ? <span className="text-xs text-muted-foreground">Connecting…</span> : null}
      </div>
    </Button>
  );
});

type WalletDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wallets: UiWallet[];
  activeWalletName: string | null;
  onConnected: () => void;
  onDisconnect: () => void;
  accountAddress: string | null;
  title?: string;
  emptyStateHref?: string;
  emptyStateCta?: string;
  emptyStateDescription?: string;
};

export const WalletDrawer = memo(function WalletDrawer({
  open,
  onOpenChange,
  wallets,
  activeWalletName,
  onConnected,
  onDisconnect,
  accountAddress,
  title = 'Select a wallet',
  emptyStateHref = 'https://solana.com/solana-wallets',
  emptyStateCta = 'Get a Solana wallet',
  emptyStateDescription = 'No wallets detected.',
}: WalletDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="top">
      <DrawerContent className="mx-auto w-full max-w-lg rounded-b-3xl border-b border-border bg-card">
        <DrawerHeader className="pb-4">
          <DrawerTitle className="text-center text-base font-semibold">
            {accountAddress ? 'Switch wallet' : title}
          </DrawerTitle>
        </DrawerHeader>
        <div className="space-y-4 px-4 pb-6">
          {accountAddress ? (
            <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
              <p className="text-sm font-medium text-muted-foreground">Current wallet</p>
              <p className="mt-1 font-mono text-sm">{accountAddress}</p>
              <Button type="button" variant="ghost" className="mt-4 w-full" onClick={onDisconnect}>
                Disconnect
              </Button>
            </div>
          ) : null}

          <div className="space-y-3">
            {wallets.length ? (
              wallets.map((wallet) => (
                <WalletOptionButton
                  key={wallet.name}
                  wallet={wallet}
                  isActive={Boolean(activeWalletName && activeWalletName === wallet.name)}
                  onConnected={onConnected}
                />
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-border/60 p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  {emptyStateDescription}{' '}
                  <a className="text-primary underline" href={emptyStateHref} target="_blank" rel="noreferrer">
                    {emptyStateCta}
                  </a>
                  .
                </p>
              </div>
            )}
          </div>

          <div className="mx-auto mt-4 h-1 w-12 rounded-full bg-muted-foreground/40" />
        </div>
      </DrawerContent>
    </Drawer>
  );
});
