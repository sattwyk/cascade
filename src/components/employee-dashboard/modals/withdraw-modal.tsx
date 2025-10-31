'use client';

import { useMemo, useState } from 'react';

import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { useEmployeeDashboard } from '@/components/employee-dashboard/employee-dashboard-context';
import { useSolana } from '@/components/solana/use-solana';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useWithdrawMutation } from '@/features/cascade/data-access/use-withdraw-mutation';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  stream: {
    id: string;
    employerName: string;
    employerWallet: string | null;
    streamAddress: string;
    vaultAddress: string;
    mintAddress: string | null;
    availableBalance: number;
  };
}

function toBaseUnits(amount: number) {
  // Until we have mint metadata, assume UI amounts are denominated with 2 decimal places.
  return BigInt(Math.round(amount * 100));
}

export function WithdrawModal({ isOpen, onClose, stream }: WithdrawModalProps) {
  const { account } = useSolana();
  const { isWithdrawing, setIsWithdrawing } = useEmployeeDashboard();
  const [amount, setAmount] = useState('');

  if (!account) {
    throw new Error('Wallet account is required to withdraw funds.');
  }

  const withdrawMutation = useWithdrawMutation({ account });

  const availableBalance = stream.availableBalance;
  const disableSubmit = isWithdrawing || withdrawMutation.isPending;

  const employerName = stream.employerName;

  const maxAmountLabel = useMemo(() => `$${availableBalance.toFixed(2)}`, [availableBalance]);

  const handleWithdraw = async () => {
    const withdrawAmount = Number.parseFloat(amount);

    if (!Number.isFinite(withdrawAmount) || withdrawAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (withdrawAmount > availableBalance) {
      toast.error('Amount exceeds available balance');
      return;
    }

    if (!stream.employerWallet) {
      toast.error('Missing employer wallet for this stream.');
      return;
    }

    if (!stream.mintAddress) {
      toast.error('Token mint is unavailable for this stream.');
      return;
    }

    setIsWithdrawing(true);
    try {
      await withdrawMutation.mutateAsync({
        employer: stream.employerWallet,
        mintAddress: stream.mintAddress,
        amount: withdrawAmount,
        amountBaseUnits: toBaseUnits(withdrawAmount),
        streamId: stream.id,
        stream: stream.streamAddress,
        vault: stream.vaultAddress,
      });

      setAmount('');
      onClose();
    } catch (error) {
      console.error('Withdrawal failed:', error);
      // Errors are surfaced via the mutation's onError handler.
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleMaxClick = () => {
    setAmount(availableBalance.toString());
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Withdraw Funds</DialogTitle>
          <DialogDescription>Withdraw your earned funds from {employerName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="amount">Amount</Label>
              <Button type="button" variant="ghost" size="sm" className="h-auto p-0 text-xs" onClick={handleMaxClick}>
                Max: {maxAmountLabel}
              </Button>
            </div>
            <div className="relative">
              <span className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="pl-7"
                step="0.01"
                min="0"
                max={availableBalance}
              />
            </div>
          </div>

          <div className="rounded-lg bg-muted/50 p-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Available Balance</span>
              <span className="font-medium">${availableBalance.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1" disabled={disableSubmit}>
            Cancel
          </Button>
          <Button onClick={handleWithdraw} className="flex-1" disabled={disableSubmit}>
            {(isWithdrawing || withdrawMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {disableSubmit ? 'Withdrawing...' : 'Withdraw'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
