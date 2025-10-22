import { useMutation } from '@tanstack/react-query';
import { UiWalletAccount, useWalletUiSigner } from '@wallet-ui/react';
import { useWalletUiSignAndSend } from '@wallet-ui/react-gill';
import { toast } from 'sonner';

import { CASCADE_PROGRAM_ADDRESS, getGreetInstruction } from '@project/anchor';

import { toastTx } from '@/components/toast-tx';

export function useGreetMutation({ account }: { account: UiWalletAccount }) {
  const txSigner = useWalletUiSigner({ account });
  const signAndSend = useWalletUiSignAndSend();

  return useMutation({
    mutationFn: async () => {
      return await signAndSend(getGreetInstruction({ programAddress: CASCADE_PROGRAM_ADDRESS }), txSigner);
    },
    onSuccess: (signature) => {
      toastTx(signature);
    },
    onError: () => toast.error('Failed to run program'),
  });
}
