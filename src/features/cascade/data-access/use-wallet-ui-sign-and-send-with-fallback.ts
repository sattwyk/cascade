import { useWalletUiGill } from '@wallet-ui/react-gill';
import { createTransaction, getBase58Decoder, signAndSendTransactionMessageWithSigners } from 'gill';

import { getErrorMessage } from './derive-cascade-pdas';

type Instruction = Parameters<typeof createTransaction>[0]['instructions'][number];
type InstructionInput = Instruction | Instruction[];

export function useWalletUiSignAndSendWithFallback() {
  const client = useWalletUiGill();

  return async (ix: InstructionInput, signer: Parameters<typeof createTransaction>[0]['feePayer']) => {
    const instructions = Array.isArray(ix) ? ix : [ix];
    const { value: latestBlockhash } = await client.rpc.getLatestBlockhash().send();

    const isUserCancelled = (message: string) => {
      const normalized = message.toLowerCase();
      return (
        normalized.includes('user rejected') ||
        normalized.includes('user declined') ||
        normalized.includes('user canceled') ||
        normalized.includes('user cancelled') ||
        normalized.includes('rejected the request')
      );
    };

    const shouldRetryWithV0 = (message: string) => {
      const normalized = message.toLowerCase();
      return (
        normalized.includes('versioned') ||
        normalized.includes('transaction version') ||
        normalized.includes('address lookup') ||
        normalized.includes('lookup table')
      );
    };

    const sendWithVersion = async (version: 0 | 'legacy') => {
      const transaction = createTransaction({
        feePayer: signer,
        instructions,
        latestBlockhash,
        version,
      });

      const signatureBytes = await signAndSendTransactionMessageWithSigners(transaction);
      return getBase58Decoder().decode(signatureBytes);
    };

    try {
      return await sendWithVersion('legacy');
    } catch (error) {
      const message = getErrorMessage(error);

      if (isUserCancelled(message)) {
        throw error instanceof Error ? error : new Error(message);
      }

      if (shouldRetryWithV0(message)) {
        console.warn('[wallet] legacy sign-and-send failed, retrying v0 transaction', { message });
        return await sendWithVersion(0);
      }

      throw error instanceof Error ? error : new Error(message);
    }
  };
}
