'use client';

import { useMemo, useState } from 'react';

import { address } from 'gill';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

import { useSolana } from '@/components/solana/use-solana';
import { toastTx } from '@/components/toast-tx';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useEmergencyWithdrawMutation } from '@/features/cascade/data-access';
import { useDashboardStreamsQuery } from '@/features/dashboard/data-access/use-dashboard-streams-query';

interface EmergencyWithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  streamId?: string;
}

export function EmergencyWithdrawModal({ isOpen, onClose, streamId }: EmergencyWithdrawModalProps) {
  const [acknowledged, setAcknowledged] = useState(false);
  const { account, connected } = useSolana();
  const { data: streams } = useDashboardStreamsQuery({});
  const emergencyWithdrawMutation = useEmergencyWithdrawMutation({ account: account! });

  const stream = useMemo(() => {
    if (!streamId || !streams) return null;
    return streams.find((s) => s.id === streamId);
  }, [streamId, streams]);

  const vaultBalance = stream?.vaultBalance ?? 0;

  const inactivityDays = useMemo(() => {
    if (!stream) return 0;
    if (!stream.lastActivityAt) return 0;
    const lastActivity = new Date(stream.lastActivityAt);
    const now = new Date();
    const diffMs = now.getTime() - lastActivity.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }, [stream]);

  const canWithdraw = inactivityDays >= 30;

  const resetForm = () => {
    setAcknowledged(false);
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

    if (!acknowledged) {
      toast.error('Acknowledgment required', {
        description: 'Please confirm you understand the consequences.',
      });
      return;
    }

    if (!canWithdraw) {
      toast.error('Withdrawal not allowed', {
        description: `Employee must be inactive for at least 30 days. Current inactivity: ${inactivityDays} days.`,
      });
      return;
    }

    try {
      const result = await emergencyWithdrawMutation.mutateAsync({
        employee: address(stream.employeeWallet!),
        employerTokenAccount: address(stream.employerTokenAccount),
        stream: address(stream.streamAddress),
        vault: address(stream.vaultAddress),
      });

      toastTx(result.signature, 'Emergency withdrawal processed');
      resetForm();
      onClose();
    } catch (error) {
      console.error('Failed to process emergency withdrawal', { streamId, error });
      toast.error('Failed to process withdrawal', {
        description: error instanceof Error ? error.message : 'Please try again or contact support.',
      });
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const USD_FORMATTER = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (!stream) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Emergency Withdraw
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
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Emergency Withdraw
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Warning message */}
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">
              This action will immediately suspend the stream and refund remaining funds to your employer account. This
              cannot be undone.
            </p>
          </div>

          {/* Stream info */}
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Employee</p>
            <p className="font-semibold">{stream.employeeName}</p>
          </div>

          {/* Inactivity warning */}
          {!canWithdraw && (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4">
              <p className="text-sm text-amber-700 dark:text-amber-400">
                <strong>Note:</strong> Emergency withdrawal requires the employee to be inactive for at least 30 days.
                Current inactivity: {inactivityDays} days.
              </p>
            </div>
          )}

          {/* Reason */}
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <p className="mb-2 text-sm text-muted-foreground">Reason for Withdrawal</p>
              <p className="font-semibold">
                Employee inactive for {inactivityDays} days {canWithdraw ? '✓' : '(minimum 30 required)'}
              </p>
            </CardContent>
          </Card>

          {/* Amount to be refunded */}
          <Card>
            <CardContent className="pt-6">
              <p className="mb-2 text-sm text-muted-foreground">Amount to be Refunded</p>
              <p className="text-2xl font-bold">{USD_FORMATTER.format(vaultBalance)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{stream.mintLabel}</p>
            </CardContent>
          </Card>

          {/* Acknowledgment */}
          <div className="flex items-start gap-3 rounded-lg border border-border p-3">
            <Checkbox
              id="acknowledge"
              checked={acknowledged}
              onCheckedChange={(checked) => setAcknowledged(checked as boolean)}
              disabled={!canWithdraw}
            />
            <Label htmlFor="acknowledge" className="text-sm leading-relaxed">
              I understand this will suspend the stream and the employee will no longer receive hourly payments
            </Label>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 border-t border-border pt-6">
            <Button variant="outline" onClick={handleClose} className="flex-1 bg-transparent">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleSubmit}
              disabled={!acknowledged || !canWithdraw || emergencyWithdrawMutation.isPending}
              className="flex-1"
            >
              {emergencyWithdrawMutation.isPending ? 'Processing...' : 'Confirm Withdrawal'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
