'use client';

import { useMemo, useState } from 'react';

import type { UiWalletAccount } from '@wallet-ui/react';
import { address } from 'gill';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';

import { useSolana } from '@/components/solana/use-solana';
import { toastTx } from '@/components/toast-tx';
import { Button } from '@/core/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/core/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/core/ui/dialog';
import { Input } from '@/core/ui/input';
import { Label } from '@/core/ui/label';
import { useTopUpStreamMutation } from '@/features/streams/client/mutations/use-top-up-stream-mutation';
import { useDashboardStreamsQuery } from '@/features/streams/client/queries/use-dashboard-streams-query';
import type { DashboardStream } from '@/types/stream';

interface TopUpStreamModalProps {
  isOpen: boolean;
  onClose: () => void;
  streamId?: string;
}

export function TopUpStreamModal({ isOpen, onClose, streamId }: TopUpStreamModalProps) {
  const [topUpAmount, setTopUpAmount] = useState('');
  const { account, connected } = useSolana();
  const { data: streams } = useDashboardStreamsQuery({});

  const stream = useMemo(() => {
    if (!streamId || !streams) return null;
    return streams.find((s) => s.id === streamId);
  }, [streamId, streams]);

  if (!account) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Top Up Stream</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">Connect your employer wallet to fund a stream.</p>
            <div className="flex gap-3 border-t border-border pt-6">
              <Button variant="outline" onClick={onClose} className="flex-1 bg-transparent">
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!stream) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Top Up Stream</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">Stream not found. Please select a valid stream.</p>
            <div className="flex gap-3 border-t border-border pt-6">
              <Button variant="outline" onClick={onClose} className="flex-1 bg-transparent">
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <TopUpStreamModalContent
      isOpen={isOpen}
      onClose={onClose}
      account={account}
      connected={connected}
      stream={stream}
      topUpAmount={topUpAmount}
      setTopUpAmount={setTopUpAmount}
    />
  );
}

type TopUpStreamModalContentProps = {
  isOpen: boolean;
  onClose: () => void;
  account: UiWalletAccount;
  connected: boolean;
  stream: DashboardStream;
  topUpAmount: string;
  setTopUpAmount: (value: string) => void;
};

function TopUpStreamModalContent({
  isOpen,
  onClose,
  account,
  connected,
  stream,
  topUpAmount,
  setTopUpAmount,
}: TopUpStreamModalContentProps) {
  const topUpMutation = useTopUpStreamMutation({ account });

  const currentVaultBalance = stream.vaultBalance ?? 0;
  const hourlyRate = stream.hourlyRate ?? 0;
  const currentRunway = hourlyRate > 0 ? Math.floor(currentVaultBalance / (hourlyRate * 24)) : 0;

  const topUpAmountNumber = Number.parseFloat(topUpAmount) || 0;
  const newVaultBalance = currentVaultBalance + topUpAmountNumber;
  const newRunway = hourlyRate > 0 ? Math.floor(newVaultBalance / (hourlyRate * 24)) : 0;

  const resetForm = () => {
    setTopUpAmount('');
  };

  const handleSubmit = async () => {
    if (!connected || !account) {
      toast.error('Wallet not connected', {
        description: 'Please connect your wallet to continue.',
      });
      return;
    }

    if (!stream) {
      toast.error('Stream not found', {
        description: 'Unable to find the stream. Please try again.',
      });
      return;
    }

    if (!topUpAmount || topUpAmountNumber <= 0) {
      toast.error('Invalid amount', {
        description: 'Please enter a valid top-up amount.',
      });
      return;
    }

    try {
      const result = await topUpMutation.mutateAsync({
        streamId: stream.id,
        employee: address(stream.employeeWallet!),
        employerTokenAccount: address(stream.employerTokenAccount),
        additionalAmount: topUpAmountNumber,
        stream: address(stream.streamAddress),
        vault: address(stream.vaultAddress),
      });

      toastTx(result.signature, 'Stream topped up successfully');
      resetForm();
      onClose();
    } catch (error) {
      console.error('Failed to top up stream', { streamId: stream.id, error });
      toast.error('Failed to top up stream', {
        description: error instanceof Error ? error.message : 'Please try again or contact support.',
      });
    }
  };

  const handleClose = () => {
    if (topUpAmount) {
      toast.info('Top up cancelled', {
        description: 'Your changes have been discarded.',
      });
    }
    resetForm();
    onClose();
  };

  const USD_FORMATTER = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Top Up Stream</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Stream info */}
          <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
            <div>
              <p className="text-xs text-muted-foreground">Employee</p>
              <p className="font-semibold">{stream.employeeName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Mint Address</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded bg-muted px-2 py-1 font-mono text-xs">
                  {stream.mintAddress}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(stream.mintAddress);
                    toast.success('Mint address copied');
                  }}
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded hover:bg-muted"
                  title="Copy mint address"
                >
                  <Copy className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            </div>
          </div>

          {/* Current balance */}
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Current Balance</p>
                  <p className="text-lg font-semibold">{USD_FORMATTER.format(currentVaultBalance)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Current Runway</p>
                  <p className="text-lg font-semibold">{currentRunway} days</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top up amount */}
          <div className="space-y-2">
            <Label htmlFor="topup-amount">Top Up Amount</Label>
            <Input
              id="topup-amount"
              type="number"
              value={topUpAmount}
              onChange={(e) => setTopUpAmount(e.target.value)}
              placeholder="0.000000"
              min="0"
              step="0.000001"
            />
          </div>

          {/* New balance preview */}
          {topUpAmount && topUpAmountNumber > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">After Top Up</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">New Balance</span>
                  <span className="font-semibold">{USD_FORMATTER.format(newVaultBalance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">New Runway</span>
                  <span className="font-semibold">{newRunway} days</span>
                </div>
                <div className="flex justify-between border-t border-border pt-3">
                  <span className="text-muted-foreground">Total Deposited</span>
                  <span className="font-semibold">
                    {USD_FORMATTER.format(stream.totalDeposited + topUpAmountNumber)}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 border-t border-border pt-6">
            <Button variant="outline" onClick={handleClose} className="flex-1 bg-transparent">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!topUpAmount || topUpAmountNumber <= 0 || topUpMutation.isPending}
              className="flex-1"
            >
              {topUpMutation.isPending ? 'Processing...' : 'Confirm Top Up'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
