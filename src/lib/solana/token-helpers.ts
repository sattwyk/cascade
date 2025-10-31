import type { Address } from 'gill';

import { ellipsify } from '@/lib/utils';

type ParsedTokenAmount = {
  amount?: string;
  uiAmount?: number | null;
  uiAmountString?: string | null;
};

type TokenAccountLike = {
  account?: {
    data?: {
      parsed?: {
        info?: {
          tokenAmount?: ParsedTokenAmount;
        };
      };
    };
  };
};

export const NULL_ADDRESS = '11111111111111111111111111111111' as Address;

const KNOWN_MINTS: Record<string, { symbol: string }> = {
  So11111111111111111111111111111111111111112: { symbol: 'wSOL' },
};

/**
 * Returns true when any token account entry reports a positive balance.
 * Safely handles the various representations returned by Solana RPC.
 */
export function hasPositiveTokenBalance(entries: TokenAccountLike[] | null | undefined): boolean {
  if (!entries) return false;

  return entries.some((entry) => {
    const tokenAmount = entry.account?.data?.parsed?.info?.tokenAmount;
    if (!tokenAmount) return false;

    const { uiAmount, uiAmountString, amount } = tokenAmount;

    if (typeof uiAmount === 'number' && Number.isFinite(uiAmount) && uiAmount > 0) {
      return true;
    }

    if (typeof uiAmountString === 'string') {
      const parsed = Number.parseFloat(uiAmountString);
      if (Number.isFinite(parsed) && parsed > 0) {
        return true;
      }
    }

    if (typeof amount === 'string') {
      try {
        if (BigInt(amount) > 0n) {
          return true;
        }
      } catch {
        const fallback = Number.parseFloat(amount);
        if (Number.isFinite(fallback) && fallback > 0) {
          return true;
        }
      }
    }

    return false;
  });
}

export function resolveMintDisplay(mint?: string | null) {
  if (!mint) {
    return {
      symbol: 'SPL token',
      detail: undefined,
      isKnown: false,
    } as const;
  }

  const known = KNOWN_MINTS[mint];
  if (known) {
    return {
      symbol: known.symbol,
      detail: ellipsify(mint, 4),
      isKnown: true,
    } as const;
  }

  return {
    symbol: 'SPL token',
    detail: ellipsify(mint, 4),
    isKnown: false,
  } as const;
}
