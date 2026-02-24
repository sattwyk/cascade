'use client';

import { useMemo, useState } from 'react';

import type { UiWalletAccount } from '@wallet-ui/react';
import { address } from 'gill';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

import { useSolana } from '@/components/solana/use-solana';
import { Button } from '@/core/ui/button';
import { Card, CardContent } from '@/core/ui/card';
import { Checkbox } from '@/core/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/core/ui/dialog';
import { Label } from '@/core/ui/label';
import { useCloseStreamMutation } from '@/features/streams/client/mutations/use-close-stream-mutation';
import { useDashboardStreamsQuery } from '@/features/streams/client/queries/use-employer-streams-query';
import type { DashboardStream } from '@/types/stream';

interface CloseStreamModalProps {
  isOpen: boolean;
  onClose: () => void;
  streamId?: string;
}

export function CloseStreamModal({ isOpen, onClose, streamId }: CloseStreamModalProps) {
  const [acknowledged, setAcknowledged] = useState(false);
  const { account, connected } = useSolana();
  const { data: streams } = useDashboardStreamsQuery({});

  const stream = useMemo(() => {
    if (!streamId || !streams) return null;
    return streams.find((streamItem) => streamItem.id === streamId);
  }, [streamId, streams]);

  const handleClose = () => {
    setAcknowledged(false);
    onClose();
  };

  if (!account) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Close Stream
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">Connect your employer wallet to close a stream.</p>
            <div className="flex gap-3 border-t border-border pt-6">
              <Button variant="outline" onClick={handleClose} className="flex-1 bg-transparent">
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
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Close Stream
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">Stream not found. Please select a valid stream.</p>
            <div className="flex gap-3 border-t border-border pt-6">
              <Button variant="outline" onClick={handleClose} className="flex-1 bg-transparent">
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <CloseStreamModalContent
      isOpen={isOpen}
      onClose={handleClose}
      stream={stream}
      account={account}
      connected={connected}
      acknowledged={acknowledged}
      setAcknowledged={setAcknowledged}
    />
  );
}

type CloseStreamModalContentProps = {
  isOpen: boolean;
  onClose: () => void;
  stream: DashboardStream;
  account: UiWalletAccount;
  connected: boolean;
  acknowledged: boolean;
  setAcknowledged: (value: boolean) => void;
};

function CloseStreamModalContent({
  isOpen,
  onClose,
  stream,
  account,
  connected,
  acknowledged,
  setAcknowledged,
}: CloseStreamModalContentProps) {
  const closeStreamMutation = useCloseStreamMutation({ account });

  const handleSubmit = async () => {
    if (!connected) {
      toast.error('Wallet not connected', {
        description: 'Please connect your wallet to continue.',
      });
      return;
    }

    if (!acknowledged) {
      toast.error('Acknowledgment required', {
        description: 'Please confirm you understand this action is permanent.',
      });
      return;
    }

    if (!stream.employeeWallet) {
      toast.error('Missing employee wallet', {
        description: 'Stream record is missing employee wallet metadata.',
      });
      return;
    }

    try {
      const result = await closeStreamMutation.mutateAsync({
        employee: address(stream.employeeWallet),
        employerTokenAccount: address(stream.employerTokenAccount),
        stream: address(stream.streamAddress),
        vault: address(stream.vaultAddress),
      });

      console.log('[close-stream] signature', result.signature);
      setAcknowledged(false);
      onClose();
    } catch (error) {
      console.error('Failed to close stream', { streamId: stream.id, error });
      toast.error('Failed to close stream', {
        description: error instanceof Error ? error.message : 'Please try again or contact support.',
      });
    }
  };

  const handleClose = () => {
    setAcknowledged(false);
    onClose();
  };

  const isSubmitting = closeStreamMutation.isPending;
  const statusLabel = stream.status;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Close Stream
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">
              Closing a stream is permanent. Any remaining vault balance will be swept back to your treasury token
              account, then the stream and vault PDAs will be closed.
            </p>
          </div>

          <Card className="bg-muted/50">
            <CardContent className="space-y-2 pt-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Employee</p>
                <p className="font-semibold">{stream.employeeName}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-semibold capitalize">{statusLabel}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Vault Balance</p>
                <p className="font-semibold">
                  {stream.vaultBalance.toFixed(6)} {stream.mintLabel}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-start gap-3 rounded-lg border border-border p-3">
            <Checkbox
              id="acknowledge"
              checked={acknowledged}
              onCheckedChange={(checked) => setAcknowledged(checked as boolean)}
            />
            <Label htmlFor="acknowledge" className="text-sm leading-relaxed">
              I understand this action is permanent and cannot be undone
            </Label>
          </div>

          <div className="flex gap-3 border-t border-border pt-6">
            <Button variant="outline" onClick={handleClose} className="flex-1 bg-transparent" disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleSubmit}
              disabled={!acknowledged || isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Processing...' : 'Close Stream'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
