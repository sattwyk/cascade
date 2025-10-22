import { useState } from 'react';

import { Address } from 'gill';

import { AppModal } from '@/components/app-modal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useRequestAirdropMutation } from '../data-access/use-request-airdrop-mutation';

export function AccountUiModalAirdrop({ address }: { address: Address }) {
  const mutation = useRequestAirdropMutation({ address });
  const [amount, setAmount] = useState('2');

  return (
    <AppModal
      title="Airdrop"
      submitDisabled={!amount || mutation.isPending}
      submitLabel="Request Airdrop"
      submit={() => mutation.mutateAsync(parseFloat(amount))}
    >
      <Label htmlFor="amount">Amount</Label>
      <Input
        disabled={mutation.isPending}
        id="amount"
        min="1"
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount"
        step="any"
        type="number"
        value={amount}
      />
    </AppModal>
  );
}
