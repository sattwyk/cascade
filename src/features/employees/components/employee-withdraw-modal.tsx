'use client';

import { useState } from 'react';

import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { useSolana } from '@/components/solana/use-solana';
import { Button } from '@/core/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/core/ui/dialog';
import { Input } from '@/core/ui/input';
import { Label } from '@/core/ui/label';
import { useWithdrawMutation } from '@/features/streams/client/mutations/use-withdraw-mutation';

import { useEmployeeDashboard } from './employee-dashboard-context';

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

const AMOUNT_DECIMALS = 6;

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

  const maxAmountLabel = `$${availableBalance.toFixed(AMOUNT_DECIMALS)}`;

  const handleWithdraw = () => {
    const withdrawAmount = Number.parseFloat(amount);
    const roundedAmount = Number.isFinite(withdrawAmount) ? Number(withdrawAmount.toFixed(AMOUNT_DECIMALS)) : NaN;

    if (!Number.isFinite(roundedAmount) || roundedAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (roundedAmount > availableBalance) {
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
    void withdrawMutation
      .mutateAsync({
        employer: stream.employerWallet,
        mintAddress: stream.mintAddress,
        amount: roundedAmount,
        streamId: stream.id,
        stream: stream.streamAddress,
        vault: stream.vaultAddress,
      })
      .then(() => {
        setAmount('');
        onClose();
      })
      .catch((error) => {
        console.error('Withdrawal failed:', error);
        // Errors are surfaced via the mutation's onError handler.
      })
      .finally(() => {
        setIsWithdrawing(false);
      });
  };

  const handleMaxClick = () => {
    setAmount(availableBalance.toFixed(AMOUNT_DECIMALS));
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
                placeholder="0.000000"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="pl-7"
                step="0.000001"
                min="0"
                max={availableBalance}
              />
            </div>
          </div>

          <div className="rounded-lg bg-muted/50 p-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Available Balance</span>
              <span className="font-medium">${availableBalance.toFixed(AMOUNT_DECIMALS)}</span>
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
