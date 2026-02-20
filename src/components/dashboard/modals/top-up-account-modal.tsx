'use client';

import { useMemo, useState } from 'react';

import { useWalletUi } from '@wallet-ui/react';
import { LAMPORTS_PER_SOL, type Address } from 'gill';
import { toast } from 'sonner';

import { createActivityLog } from '@/app/dashboard/actions/activity-log';
import { EURCIcon, SolanaIcon, USDCIcon, USDTIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useGetBalanceQuery } from '@/features/account/data-access/use-get-balance-query';
import { useGetTokenAccountsQuery } from '@/features/account/data-access/use-get-token-accounts-query';
import { useRequestAirdropMutation } from '@/features/account/data-access/use-request-airdrop-mutation';
import { useRequestDevTokenTopUpMutation } from '@/features/account/data-access/use-request-dev-token-top-up-mutation';
import { resolveMintDisplay } from '@/lib/solana/token-helpers';

import { useDashboard } from '../dashboard-context';

interface TopUpAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function FundingSnapshotCard({
  fundingError,
  isFundingLoading,
  solBalance,
  tokenBalanceLabel,
  monthlyBurn,
}: {
  fundingError: Error | undefined;
  isFundingLoading: boolean;
  solBalance: number;
  tokenBalanceLabel: string;
  monthlyBurn: number;
}) {
  return (
    <Card className="bg-muted/50">
      <CardContent className="space-y-3 pt-6">
        {fundingError ? (
          <div className="text-xs text-destructive">
            <p className="font-medium">Unable to load balances</p>
            <p className="mt-1 leading-relaxed text-destructive/80">{fundingError.message}</p>
          </div>
        ) : (
          <>
            <div className="flex justify-between">
              <span className="text-xs text-muted-foreground">Vault Balance</span>
              <span className="font-semibold">
                {isFundingLoading ? 'Loading...' : `${SOL_FORMATTER.format(solBalance)} SOL`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-muted-foreground">Token Treasury</span>
              <span className="font-semibold">{isFundingLoading ? 'Loading...' : tokenBalanceLabel}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-3">
              <span className="text-xs text-muted-foreground">Monthly Burn</span>
              <span className="font-semibold">
                {monthlyBurn > 0 ? `$${monthlyBurn.toFixed(2)}` : 'Set via settings'}
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function TokenSelectionGrid({
  selectedToken,
  setSelectedToken,
}: {
  selectedToken: TokenOption;
  setSelectedToken: (token: TokenOption) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>Select Token</Label>
      <div className="grid grid-cols-2 gap-2">
        {TOKEN_OPTIONS.map(({ id, label, description, Icon, disabled }) => (
          <button
            key={id}
            onClick={() => !disabled && setSelectedToken(id)}
            disabled={disabled}
            className={`flex w-full flex-col items-start gap-1 rounded-lg border p-3 text-left text-sm font-medium transition-colors ${
              selectedToken === id ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:bg-muted/50'
            } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
          >
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </span>
            {description ? <span className="text-xs text-muted-foreground">{description}</span> : null}
          </button>
        ))}
      </div>
    </div>
  );
}

function TopUpPreviewCard({
  topUpAmount,
  solPreviewBalance,
  tokenPreviewLabel,
  runwayDays,
}: {
  topUpAmount: string;
  solPreviewBalance: number;
  tokenPreviewLabel: string;
  runwayDays: number | null;
}) {
  if (!topUpAmount) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">After Top Up</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between">
          <span className="text-muted-foreground">New Vault Balance</span>
          <span className="font-semibold">{`${SOL_FORMATTER.format(solPreviewBalance)} SOL`}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Selected Asset Balance</span>
          <span className="font-semibold">{tokenPreviewLabel}</span>
        </div>
        <div className="flex justify-between border-t border-border pt-3">
          <span className="text-muted-foreground">Network Fee</span>
          <span className="font-semibold">~0.00025 SOL</span>
        </div>
        <div className="flex justify-between border-t border-border pt-3">
          <span className="text-muted-foreground">Estimated Runway</span>
          <span className="font-semibold">{runwayDays != null ? `${runwayDays} days` : 'N/A'}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export function TopUpAccountModal({ isOpen, onClose }: TopUpAccountModalProps) {
  const [topUpAmount, setTopUpAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState<TokenOption>('USDC');
  const { completeSetupStep } = useDashboard();
  const { account, cluster } = useWalletUi();

  const enableDevFaucet = process.env.NEXT_PUBLIC_CASCADE_ENABLE_DEV_FAUCET === 'true';
  const isProduction = process.env.NODE_ENV === 'production';
  const clusterMoniker: ClusterMoniker = cluster?.id === 'solana:localnet' ? 'localnet' : 'devnet';

  const employerAddress = useMemo<Address>(
    () => (account?.address as Address) ?? ('11111111111111111111111111111111' as Address),
    [account?.address],
  );

  const { mutateAsync: requestAirdrop, isPending: isAirdropping } = useRequestAirdropMutation({
    address: employerAddress,
  });
  const { mutateAsync: requestDevTokens, isPending: isMinting } = useRequestDevTokenTopUpMutation({
    address: employerAddress,
  });

  const isProcessing = isAirdropping || isMinting;

  const balanceQuery = useGetBalanceQuery({ address: employerAddress, enabled: Boolean(account?.address) });
  const tokenAccountsQuery = useGetTokenAccountsQuery({ address: employerAddress, enabled: Boolean(account?.address) });

  const lamportsRaw = balanceQuery.data?.value;
  const solBalanceLamports = typeof lamportsRaw === 'bigint' ? lamportsRaw : BigInt(lamportsRaw ?? 0);
  const solBalance = Number(solBalanceLamports) / Number(LAMPORTS_PER_SOL);

  const tokenTotals = useMemo(() => {
    if (!tokenAccountsQuery.data) return [] as TokenTotal[];

    const totals = new Map<string, { amount: number; decimals: number; accounts: number }>();

    for (const entry of tokenAccountsQuery.data as Array<{
      account: {
        data: {
          parsed?: {
            info?: {
              mint?: string;
              tokenAmount?: {
                amount?: string;
                decimals?: number;
                uiAmount?: number | null;
                uiAmountString?: string;
              };
            };
          };
        };
      };
    }>) {
      const info = entry.account?.data?.parsed?.info;
      if (!info?.mint || !info?.tokenAmount) continue;

      const { mint, tokenAmount } = info;
      const decimals = tokenAmount.decimals ?? 0;
      const uiAmountString =
        tokenAmount.uiAmountString ?? (tokenAmount.uiAmount != null ? tokenAmount.uiAmount.toString() : undefined);
      const amountFromRaw = tokenAmount.amount ? Number(tokenAmount.amount) / Math.pow(10, decimals) : 0;
      const parsedAmount = uiAmountString ? Number.parseFloat(uiAmountString) : amountFromRaw;
      if (!Number.isFinite(parsedAmount)) continue;

      const current = totals.get(mint) ?? { amount: 0, decimals, accounts: 0 };
      current.amount += parsedAmount;
      current.accounts += 1;
      totals.set(mint, current);
    }

    return Array.from(totals.entries()).map(([mint, details]) => ({ mint, ...details })) as TokenTotal[];
  }, [tokenAccountsQuery.data]);

  const primaryToken = useMemo(() => {
    if (tokenTotals.length === 0) return undefined;
    return tokenTotals.reduce<TokenTotal | undefined>(
      (top, entry) => (entry.amount > (top?.amount ?? 0) ? entry : top),
      tokenTotals[0],
    );
  }, [tokenTotals]);

  const hasTokenBalances = tokenTotals.some((token) => token.amount > 0);
  const fundingError = (balanceQuery.error as Error | undefined) ?? (tokenAccountsQuery.error as Error | undefined);
  const isFundingLoading = Boolean(account?.address) && (balanceQuery.isLoading || tokenAccountsQuery.isLoading);

  const primaryMintDisplay = primaryToken ? resolveMintDisplay(primaryToken.mint) : null;
  const primaryMintLabel = primaryMintDisplay?.symbol ?? null;
  const tokenBalanceLabel =
    hasTokenBalances && primaryToken
      ? `${TOKEN_FORMATTER.format(primaryToken.amount)} ${primaryMintLabel ?? 'SPL token'}`
      : '0 tokens';

  const selectedOption = TOKEN_OPTIONS.find((option) => option.id === selectedToken);
  const fallbackSelectedLabel = selectedOption?.label ?? selectedToken;
  const selectedMintLabel = selectedToken === 'SOL' ? 'SOL' : (primaryMintLabel ?? fallbackSelectedLabel);
  const amountLabel = `${selectedMintLabel} Amount`;
  const amountPlaceholder = selectedToken === 'SOL' ? '1.00' : '1000.00';

  const monthlyBurn = 0;
  const parsedTopUpAmount = Number.parseFloat(topUpAmount || '0');
  const validTopUpAmount = Number.isFinite(parsedTopUpAmount) && parsedTopUpAmount > 0 ? parsedTopUpAmount : 0;
  const isSolTopUp = selectedToken === 'SOL';
  const solPreviewBalance = isSolTopUp ? solBalance + validTopUpAmount : solBalance;
  const tokenPreviewLabel = isSolTopUp
    ? `${SOL_FORMATTER.format(solPreviewBalance)} SOL`
    : hasTokenBalances
      ? `${TOKEN_FORMATTER.format((primaryToken?.amount ?? 0) + validTopUpAmount)} ${selectedMintLabel}`
      : `${TOKEN_FORMATTER.format(validTopUpAmount)} ${selectedMintLabel}`;
  const runwayDays = monthlyBurn > 0 ? Math.floor(solPreviewBalance / (monthlyBurn / 30)) : null;

  const resetForm = () => {
    setTopUpAmount('');
    setSelectedToken('USDC');
  };

  const handleSubmit = async () => {
    if (!account?.address) {
      toast.error('Connect your treasury wallet', {
        description: 'You need to connect your employer wallet before topping up.',
      });
      return;
    }

    const parsedAmount = Number.parseFloat(topUpAmount || '0');
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error('Invalid amount', {
        description: 'Please enter a valid top-up amount.',
      });
      return;
    }

    // For hackathons: Allow faucet in production if explicitly enabled
    if (isProduction && !enableDevFaucet) {
      toast.error('Top up unsupported', {
        description:
          'Automatic top ups are only available on devnet/localnet. Fund the account manually or enable dev faucet.',
      });
      return;
    }

    try {
      const requestedAmount = parsedAmount || 1;

      if (selectedToken === 'SOL') {
        await requestAirdrop(requestedAmount);
        toast.success('SOL airdrop submitted', {
          description: `Requested ${requestedAmount} SOL on ${cluster?.label ?? 'devnet'}.`,
        });
        await createActivityLog({
          title: 'Requested SOL airdrop',
          description: `${requestedAmount} SOL airdrop to treasury wallet`,
          activityType: 'stream_top_up',
          actorAddress: account?.address ?? null,
          metadata: {
            token: 'SOL',
            amount: requestedAmount,
            cluster: cluster?.url ?? 'devnet',
            method: 'airdrop',
          },
        }).catch((error) => {
          console.error('[activity] Failed to log SOL airdrop', error);
        });
      } else {
        await requestDevTokens({ amount: requestedAmount, token: selectedToken, cluster: clusterMoniker });
        toast.success('Dev token top up complete', {
          description: `${requestedAmount} ${selectedToken} minted to your treasury account.`,
        });
        await createActivityLog({
          title: `Minted ${selectedToken} for treasury`,
          description: `${requestedAmount} ${selectedToken} minted via dev faucet`,
          activityType: 'stream_top_up',
          actorAddress: account?.address ?? null,
          metadata: {
            token: selectedToken,
            amount: requestedAmount,
            cluster: clusterMoniker,
            method: 'mint',
          },
        }).catch((error) => {
          console.error('[activity] Failed to log token mint', error);
        });
      }

      completeSetupStep('tokenAccountFunded');
      resetForm();
      onClose();
    } catch (error) {
      console.error('Failed to top up account', error);
      toast.error('Failed to top up account', {
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

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Top Up Account</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <FundingSnapshotCard
            fundingError={fundingError}
            isFundingLoading={isFundingLoading}
            solBalance={solBalance}
            tokenBalanceLabel={tokenBalanceLabel}
            monthlyBurn={monthlyBurn}
          />
          <TokenSelectionGrid selectedToken={selectedToken} setSelectedToken={setSelectedToken} />

          {/* Top up amount */}
          <div className="space-y-2">
            <Label htmlFor="topup-amount">{amountLabel}</Label>
            <Input
              id="topup-amount"
              type="number"
              value={topUpAmount}
              onChange={(e) => setTopUpAmount(e.target.value)}
              placeholder={amountPlaceholder}
              min="0"
              step="any"
            />
          </div>

          <TopUpPreviewCard
            topUpAmount={topUpAmount}
            solPreviewBalance={solPreviewBalance}
            tokenPreviewLabel={tokenPreviewLabel}
            runwayDays={runwayDays}
          />

          {/* Action buttons */}
          <div className="flex gap-3 border-t border-border pt-6">
            <Button variant="outline" onClick={handleClose} className="flex-1 bg-transparent">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!topUpAmount || isProcessing} className="flex-1">
              {isProcessing ? 'Processing...' : 'Confirm Top Up'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const TOKEN_OPTIONS = [
  { id: 'USDC', label: 'USDC', description: 'Minted via dev faucet', Icon: USDCIcon, disabled: false },
  { id: 'USDT', label: 'USDT', description: 'Coming soon', Icon: USDTIcon, disabled: true },
  { id: 'EURC', label: 'EURC', description: 'Coming soon', Icon: EURCIcon, disabled: true },
  { id: 'SOL', label: 'SOL', description: 'For gas fees (airdrop)', Icon: SolanaIcon, disabled: false },
] as const;

type TokenOptionMeta = (typeof TOKEN_OPTIONS)[number];
type TokenOption = TokenOptionMeta['id'];
type ClusterMoniker = 'devnet' | 'localnet';

type TokenTotal = {
  mint: string;
  amount: number;
  decimals: number;
  accounts: number;
};

const SOL_FORMATTER = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
const TOKEN_FORMATTER = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 });
