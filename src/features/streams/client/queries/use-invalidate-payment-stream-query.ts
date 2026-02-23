import { useQueryClient } from '@tanstack/react-query';

const PAYMENT_STREAM_QUERY_KEY_ROOT = ['payment-stream'] as const;

export function useInvalidatePaymentStreamQuery() {
  const queryClient = useQueryClient();

  return async () => {
    await queryClient.invalidateQueries({ queryKey: PAYMENT_STREAM_QUERY_KEY_ROOT });
  };
}
