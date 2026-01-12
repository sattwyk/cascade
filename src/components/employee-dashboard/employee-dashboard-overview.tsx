'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { UiWalletAccount } from '@wallet-ui/react';
import { formatDistanceToNow } from 'date-fns';
import { getExplorerLink, type SolanaClusterMoniker } from 'gill';
import { ArrowDownToLine, Clock, DollarSign, ExternalLink, RefreshCw, TrendingUp, Wallet } from 'lucide-react';
import { toast } from 'sonner';

import type { EmployeeDashboardOverview as EmployeeDashboardOverviewData } from '@/app/dashboard/@employee/actions/overview';
import { EmptyState } from '@/components/dashboard/empty-state';
import { useEmployeeDashboard } from '@/components/employee-dashboard/employee-dashboard-context';
import { WithdrawModal } from '@/components/employee-dashboard/modals/withdraw-modal';
import { useSolana } from '@/components/solana/use-solana';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRefreshActivityMutation } from '@/features/cascade/data-access/use-refresh-activity-mutation';
import { useEmployeeDashboardOverviewQuery } from '@/features/employee-dashboard/data-access/use-employee-dashboard-overview-query';

const AMOUNT_DECIMALS = 6;
const SECONDS_PER_HOUR = 3600;

function formatCountdown(totalSeconds: number) {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function getNextUnlockInfo(createdAt: string | null, nowMs: number) {
  if (!createdAt) return null;
  const createdAtMs = Date.parse(createdAt);
  if (!Number.isFinite(createdAtMs)) return null;

  const secondsElapsed = Math.max(0, Math.floor((nowMs - createdAtMs) / 1000));
  const secondsIntoHour = secondsElapsed % SECONDS_PER_HOUR;
  const secondsUntilNextHour = secondsIntoHour === 0 ? 0 : SECONDS_PER_HOUR - secondsIntoHour;
  const progress = secondsIntoHour / SECONDS_PER_HOUR;

  return {
    progress,
    secondsUntilNextHour,
  };
}

interface EmployeeDashboardOverviewProps {
  initialData: EmployeeDashboardOverviewData;
}

export function EmployeeDashboardOverview({ initialData }: EmployeeDashboardOverviewProps) {
  const { account, connected, cluster } = useSolana();
  const clusterMoniker = cluster.id.replace('solana:', '') as SolanaClusterMoniker;
  if (!connected || !account) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Card className="w-full max-w-md p-8">
          <div className="flex flex-col items-center space-y-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Wallet className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Connect Your Wallet</h2>
              <p className="text-muted-foreground">Connect your wallet to view your payment streams and earnings</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return <EmployeeDashboardOverviewInner initialData={initialData} account={account} clusterMoniker={clusterMoniker} />;
}

function EmployeeDashboardOverviewInner({
  initialData,
  account,
  clusterMoniker,
}: {
  initialData: EmployeeDashboardOverviewData;
  account: UiWalletAccount;
  clusterMoniker: SolanaClusterMoniker;
}) {
  const { triggerRefresh, setIsRefreshingActivity, setRefreshActivityHandler } = useEmployeeDashboard();
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [selectedStream, setSelectedStream] = useState<{
    id: string;
    employerName: string;
    employerWallet: string | null;
    streamAddress: string;
    vaultAddress: string;
    mintAddress: string | null;
    availableBalance: number;
  } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [tickerNow, setTickerNow] = useState(() => Date.now());

  const { data = initialData, isFetching } = useEmployeeDashboardOverviewQuery({ initialData });

  const { mutateAsync: refreshActivityAsync, isPending: isRefreshPending } = useRefreshActivityMutation({ account });
  const latestDataRef = useRef(data);

  useEffect(() => {
    latestDataRef.current = data;
  }, [data]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTickerNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const stats = data.stats;
  const organizationDisplayName = data.organization?.name ?? 'Employer';
  const activeStreams = useMemo(
    () => data.streams.filter((stream) => stream.status === 'active' && stream.availableBalance >= 0),
    [data.streams],
  );
  const recentWithdrawals = data.recentWithdrawals;

  const handleWithdrawClick = (stream: (typeof activeStreams)[number]) => {
    setSelectedStream({
      id: stream.id,
      employerName: stream.employerName ?? 'Employer',
      employerWallet: stream.employerWallet ?? null,
      streamAddress: stream.streamAddress,
      vaultAddress: stream.vaultAddress,
      mintAddress: stream.mintAddress,
      availableBalance: stream.availableBalance,
    });
    setWithdrawModalOpen(true);
  };

  // TODO: it throws error when there's no active streams
  const handleRefreshActivity = useCallback(async () => {
    const currentData = latestDataRef.current;
    const activeStream = currentData.streams.find((stream) => stream.status === 'active');
    if (!activeStream) {
      const error = new Error('No active streams available to refresh.');
      toast.error(error.message);
      throw error;
    }
    if (!activeStream.employerWallet) {
      const error = new Error('Missing employer wallet for this stream.');
      toast.error(error.message);
      throw error;
    }

    setIsRefreshing(true);
    try {
      await refreshActivityAsync({
        employer: activeStream.employerWallet,
        streamId: activeStream.id,
        streamAddress: activeStream.streamAddress,
      });
      triggerRefresh();
      toast.success('Activity refreshed successfully');
    } catch (error) {
      console.error('Refresh failed:', error);
      // Error toast handled by mutation; no duplicate toast here.
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshActivityAsync, triggerRefresh]);

  useEffect(() => {
    setIsRefreshingActivity(isRefreshPending || isRefreshing);
  }, [isRefreshPending, isRefreshing, setIsRefreshingActivity]);

  useEffect(() => {
    return () => {
      setIsRefreshingActivity(false);
    };
  }, [setIsRefreshingActivity]);

  useEffect(() => {
    setRefreshActivityHandler(handleRefreshActivity);
    return () => setRefreshActivityHandler(null);
  }, [handleRefreshActivity, setRefreshActivityHandler]);

  const isRefreshingActivity = isRefreshing || isFetching || isRefreshPending;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Track your payment streams, earnings, and activity</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={handleRefreshActivity} disabled={isRefreshingActivity}>
          <RefreshCw className={`h-4 w-4 ${isRefreshingActivity ? 'animate-spin' : ''}`} />
          Refresh Activity
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="flex items-center gap-2 text-xs font-medium sm:text-sm">
              <DollarSign className="h-3 w-3 shrink-0 sm:h-4 sm:w-4" />
              <span className="truncate">Total Earned</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold sm:text-2xl">${stats.totalEarned.toFixed(AMOUNT_DECIMALS)}</p>
            <p className="mt-1 text-xs text-muted-foreground">All-time earnings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="flex items-center gap-2 text-xs font-medium sm:text-sm">
              <TrendingUp className="h-3 w-3 shrink-0 sm:h-4 sm:w-4" />
              <span className="truncate">Available to Withdraw</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold sm:text-2xl">${stats.availableToWithdraw.toFixed(AMOUNT_DECIMALS)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Ready to withdraw</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="flex items-center gap-2 text-xs font-medium sm:text-sm">
              <Clock className="h-3 w-3 shrink-0 sm:h-4 sm:w-4" />
              <span className="truncate">Active Streams</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold sm:text-2xl">{stats.activeStreams}</p>
            <p className="mt-1 text-xs text-muted-foreground">Payment streams</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Streams Section */}
      <Card className="p-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold">Active Payment Streams</h2>
          <p className="text-sm text-muted-foreground">Real-time streaming payments from your employers</p>
        </div>

        {activeStreams.length === 0 ? (
          <EmptyState
            title="No Active Streams"
            description="You don't have any active payment streams yet. Contact your employer to get started."
          />
        ) : (
          <div className="space-y-3">
            {activeStreams.map((stream) => (
              <div
                key={stream.id}
                className="flex flex-col justify-between gap-4 rounded-lg border border-border/50 bg-muted/30 p-4 sm:flex-row sm:items-center"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{stream.employerName ?? 'Unknown employer'}</p>
                    <Badge variant="outline" className="text-xs">
                      <span className="mr-1.5 flex h-1.5 w-1.5 rounded-full bg-green-500" />
                      Active
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    ${stream.hourlyRate.toFixed(AMOUNT_DECIMALS)}/hour
                    {stream.createdAt ? ` • Started ${new Date(stream.createdAt).toLocaleDateString()}` : null}
                  </p>
                  {stream.hourlyRate > 0
                    ? (() => {
                        const unlockInfo = getNextUnlockInfo(stream.createdAt, tickerNow);
                        if (!unlockInfo) return null;
                        const percent = Math.min(100, Math.max(0, unlockInfo.progress * 100));
                        const prefix = stream.totalEarned > 0 ? 'Next unlock in' : 'First unlock in';
                        const timeLabel =
                          unlockInfo.secondsUntilNextHour === 0
                            ? 'Unlocking now'
                            : `${prefix} ${formatCountdown(unlockInfo.secondsUntilNextHour)}`;
                        return (
                          <div className="mt-2 space-y-1">
                            <p className="text-xs text-muted-foreground">{timeLabel}</p>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-primary transition-[width] duration-300 ease-linear"
                                style={{ width: `${percent}%` }}
                                aria-hidden="true"
                              />
                            </div>
                          </div>
                        );
                      })()
                    : null}
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Available</p>
                    <p className="text-lg font-bold text-green-600">
                      ${stream.availableBalance.toFixed(AMOUNT_DECIMALS)}
                    </p>
                  </div>
                  {stream.availableBalance > 0 && (
                    <Button size="sm" className="gap-2" onClick={() => handleWithdrawClick(stream)}>
                      <ArrowDownToLine className="h-4 w-4" />
                      Withdraw
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Payment History Section */}
      <Card className="p-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold">Recent Withdrawals</h2>
          <p className="text-sm text-muted-foreground">Your withdrawal history and transaction records</p>
        </div>

        {recentWithdrawals.length === 0 ? (
          <EmptyState title="No Withdrawal History" description="You haven't made any withdrawals yet." />
        ) : (
          <div className="space-y-3">
            {recentWithdrawals.map((payment) => {
              const signature = payment.signature ?? undefined;
              const occurredAtLabel = payment.occurredAt
                ? formatDistanceToNow(new Date(payment.occurredAt), { addSuffix: true })
                : 'Unknown time';
              const truncatedSignature =
                signature && signature.length > 8 ? `${signature.slice(0, 8)}...${signature.slice(-8)}` : signature;
              const txLink = signature ? getExplorerLink({ transaction: signature, cluster: clusterMoniker }) : null;

              return (
                <div
                  key={payment.id}
                  className="flex flex-col justify-between gap-3 rounded-lg border border-border/50 bg-muted/30 p-4 sm:flex-row sm:items-center"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{organizationDisplayName}</p>
                      <Badge variant="outline" className="border-green-200 bg-green-500/10 text-xs text-green-700">
                        Completed
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{occurredAtLabel}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <code className="rounded bg-muted px-1">{truncatedSignature ?? 'N/A'}</code>
                      {txLink ? (
                        <a
                          href={txLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 transition-colors hover:text-primary"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View
                        </a>
                      ) : null}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">+${payment.amount.toFixed(AMOUNT_DECIMALS)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Withdraw Modal */}
      {selectedStream && (
        <WithdrawModal
          isOpen={withdrawModalOpen}
          onClose={() => {
            setWithdrawModalOpen(false);
            setSelectedStream(null);
          }}
          stream={selectedStream}
        />
      )}
    </div>
  );
}
