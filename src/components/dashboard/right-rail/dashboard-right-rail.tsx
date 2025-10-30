'use client';

import { useMemo } from 'react';

import { useWalletUi } from '@wallet-ui/react';
import { LAMPORTS_PER_SOL, type Address } from 'gill';
import { AlertTriangle, ArrowRight, Flame, PiggyBank, ShieldAlert, Sparkles, UserPlus, Wallet } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useGetBalanceQuery } from '@/features/account/data-access/use-get-balance-query';
import { useGetTokenAccountsQuery } from '@/features/account/data-access/use-get-token-accounts-query';
import { ellipsify } from '@/lib/utils';

import { useDashboard } from '../dashboard-context';

const FALLBACK_ADDRESS = '11111111111111111111111111111111' as Address;
const SOL_FORMATTER = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
const TOKEN_FORMATTER = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const KNOWN_MINT_LABELS: Record<string, string> = {
  So11111111111111111111111111111111111111112: 'wSOL',
};

type TokenTotal = {
  mint: string;
  amount: number;
  decimals: number;
  accounts: number;
};

type AlertLevel = 'critical' | 'high' | 'medium';

const alertItems: Array<{
  id: string;
  title: string;
  description: string;
  level: AlertLevel;
}> = [
  {
    id: 'low-runway',
    title: 'Critical runway',
    description: '72 hours of funding remaining for 4 employees.',
    level: 'critical',
  },
  {
    id: 'inactive-streams',
    title: 'Streams paused',
    description: '2 streams haven’t distributed in 25 days.',
    level: 'high',
  },
  {
    id: 'pending-approvals',
    title: 'Pending approvals',
    description: '3 invitation approvals waiting for action.',
    level: 'medium',
  },
];

const levelStyles: Record<
  AlertLevel,
  {
    container: string;
    badge: string;
    badgeText: string;
    iconColor: string;
  }
> = {
  critical: {
    container: 'border-destructive/40 bg-destructive/10',
    badge: 'bg-destructive/15 border border-destructive/20',
    badgeText: 'text-destructive',
    iconColor: 'text-destructive',
  },
  high: {
    container: 'border-amber-500/40 bg-amber-500/10',
    badge: 'bg-amber-500/15 border border-amber-500/20',
    badgeText: 'text-amber-600',
    iconColor: 'text-amber-600',
  },
  medium: {
    container: 'border-sky-500/40 bg-sky-500/10',
    badge: 'bg-sky-500/15 border border-sky-500/20',
    badgeText: 'text-sky-600',
    iconColor: 'text-sky-600',
  },
};

const levelLabels: Record<AlertLevel, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
};

const getLevelIcon = (level: AlertLevel) => {
  switch (level) {
    case 'critical':
      return ShieldAlert;
    case 'high':
      return Flame;
    default:
      return AlertTriangle;
  }
};

export function DashboardRightRail() {
  const { setIsTopUpAccountModalOpen, setIsAddEmployeeModalOpen, setIsCreateStreamModalOpen, setupProgress } =
    useDashboard();
  const { account } = useWalletUi();

  const walletAddress = (account?.address as Address) ?? FALLBACK_ADDRESS;

  const balanceQuery = useGetBalanceQuery({ address: walletAddress, enabled: Boolean(account?.address) });
  const tokenAccountsQuery = useGetTokenAccountsQuery({ address: walletAddress, enabled: Boolean(account?.address) });

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
              tokenAmount?: { amount?: string; decimals?: number; uiAmount?: number | null; uiAmountString?: string };
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
  const hasAnyBalance = solBalance > 0 || hasTokenBalances;
  const tokenAccountsCount = tokenAccountsQuery.data?.length ?? 0;

  const fundingError = (balanceQuery.error as Error | undefined) ?? (tokenAccountsQuery.error as Error | undefined);
  const isFundingLoading =
    Boolean(account?.address) && !hasAnyBalance && (balanceQuery.isLoading || tokenAccountsQuery.isLoading);

  const fundingMetrics = useMemo(() => {
    const walletConnected = Boolean(account?.address);
    const solValue = walletConnected ? `${SOL_FORMATTER.format(solBalance)} SOL` : '—';
    const solHelper = walletConnected
      ? solBalance > 0
        ? 'Available in treasury wallet'
        : 'No SOL detected in treasury'
      : 'Connect your treasury wallet';

    const primaryMintLabel = primaryToken ? getMintLabel(primaryToken.mint) : undefined;
    const tokenValue =
      hasTokenBalances && primaryToken
        ? `${TOKEN_FORMATTER.format(primaryToken.amount)} ${primaryMintLabel}`
        : '0 tokens';
    const tokenHelper = walletConnected
      ? hasTokenBalances && primaryToken
        ? tokenTotals.length > 1
          ? `Primary mint ${primaryMintLabel} | ${tokenAccountsCount} accounts`
          : `Holding ${primaryMintLabel}`
        : 'Mint SPL tokens to seed your treasury.'
      : 'Connect your treasury wallet';

    const runwayValue = hasTokenBalances ? 'N/A' : 'N/A';
    const runwayHelper = hasTokenBalances
      ? 'Set a burn rate or active stream to calculate runway.'
      : 'Create a stream to unlock runway insights.';

    return [
      {
        label: 'Vault Balance',
        value: solValue,
        helper: solHelper,
      },
      {
        label: 'Token Treasury',
        value: tokenValue,
        helper: tokenHelper,
      },
      {
        label: 'Runway',
        value: runwayValue,
        helper: runwayHelper,
      },
    ] as const;
  }, [account?.address, hasTokenBalances, primaryToken, solBalance, tokenAccountsCount, tokenTotals.length]);

  const latestUpdateTimestamp = Math.max(balanceQuery.dataUpdatedAt ?? 0, tokenAccountsQuery.dataUpdatedAt ?? 0);
  const badgeLabel = formatUpdateLabel(
    latestUpdateTimestamp,
    Boolean(account?.address),
    balanceQuery.isFetching || tokenAccountsQuery.isFetching,
  );

  const hasAlerts = setupProgress.streamCreated && alertItems.length > 0;

  return (
    <div className="flex min-h-full flex-col gap-5 px-4 py-6 sm:px-5 md:px-6">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold">Funding summary</CardTitle>
              <p className="text-xs text-muted-foreground">Monitor balances and keep runway healthy.</p>
            </div>
            <Badge variant="outline" className="text-xs font-medium">
              {badgeLabel}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!setupProgress.walletConnected ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-muted-foreground/40 bg-muted/10 px-4 py-6 text-center">
              <Wallet className="h-5 w-5 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Wallet not connected</p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Connect your employer treasury wallet to start tracking balances and funding streams.
                </p>
              </div>
            </div>
          ) : fundingError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-6 text-center text-xs text-destructive">
              <p className="font-medium">Failed to load balances</p>
              <p className="mt-2 leading-relaxed text-destructive/80">{fundingError.message}</p>
            </div>
          ) : hasAnyBalance ? (
            fundingMetrics.map((metric) => (
              <div key={metric.label} className="rounded-lg border border-border/70 bg-muted/10 px-3 py-3">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{metric.label}</p>
                <p className="mt-1 text-xl leading-tight font-semibold">
                  {isFundingLoading ? 'Loading...' : metric.value}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{metric.helper}</p>
              </div>
            ))
          ) : isFundingLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-16 animate-pulse rounded-lg border border-border/60 bg-muted/20" />
              ))}
            </div>
          ) : setupProgress.employeeAdded ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-muted-foreground/40 bg-muted/10 px-4 py-6 text-center">
              <Sparkles className="h-5 w-5 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">No funding data yet</p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Top up your vault or connect a treasury source to start tracking balances and runway.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-muted-foreground/40 bg-muted/10 px-4 py-6 text-center">
              <PiggyBank className="h-5 w-5 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Fund your payroll account</p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Add tokens to your default payroll account before inviting employees or creating streams.
                </p>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button
            className="w-full"
            size="sm"
            onClick={() => setIsTopUpAccountModalOpen(true)}
            disabled={!setupProgress.walletConnected}
          >
            <PiggyBank className="mr-2 h-4 w-4" />
            Top up account
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold">Alerts</CardTitle>
              <p className="text-xs text-muted-foreground">Prioritize these actions to keep payouts flowing.</p>
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground">
              View all
              <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {!setupProgress.employeeAdded ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-muted-foreground/40 bg-muted/10 px-4 py-6 text-center">
              <UserPlus className="h-5 w-5 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">No team activity yet</p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Add your first employee to start tracking payroll alerts and reminders here.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setIsAddEmployeeModalOpen(true)}
                disabled={!setupProgress.tokenAccountFunded}
              >
                Add Employee
              </Button>
            </div>
          ) : hasAlerts ? (
            alertItems.map((alert) => {
              const Icon = getLevelIcon(alert.level);
              const styles = levelStyles[alert.level];

              return (
                <div
                  key={alert.id}
                  className={`flex items-start gap-3 rounded-lg border px-3 py-3 ${styles.container}`}
                >
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${styles.iconColor}`} />
                  <div className="min-w-0 flex-1 space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <p className="leading-none font-medium">{alert.title}</p>
                      <Badge className={`${styles.badge} ${styles.badgeText}`} variant="outline">
                        {levelLabels[alert.level]}
                      </Badge>
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">{alert.description}</p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-muted-foreground/40 bg-muted/10 px-4 py-6 text-center">
              <Sparkles className="h-5 w-5 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">No alerts right now</p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  We’ll surface the most important risks here as soon as your team starts streaming.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsCreateStreamModalOpen(true)}
                disabled={!setupProgress.employeeAdded || !setupProgress.tokenAccountFunded}
              >
                Create Stream
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function getMintLabel(mint: string) {
  return KNOWN_MINT_LABELS[mint] ?? ellipsify(mint, 4);
}

function formatUpdateLabel(timestamp: number, hasWallet: boolean, isFetching: boolean) {
  if (!hasWallet) return 'Awaiting wallet';
  if (isFetching) return 'Refreshing...';
  if (!timestamp) return 'Waiting for data';

  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (seconds < 5) return 'Updated just now';
  if (seconds < 60) return `Updated ${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Updated ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Updated ${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `Updated ${days}d ago`;
}
