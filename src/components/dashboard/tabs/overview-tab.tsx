'use client';

import { useEffect, useMemo } from 'react';

import { useWalletUi } from '@wallet-ui/react';
import type { Address } from 'gill';
import { AlertCircle, TrendingDown, Users, Zap } from 'lucide-react';

import type { ActivityLogEntry } from '@/app/dashboard/actions/activity-log';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGetBalanceQuery } from '@/features/account/data-access/use-get-balance-query';
import { useGetTokenAccountsQuery } from '@/features/account/data-access/use-get-token-accounts-query';
import { useDashboardActivityQuery } from '@/features/dashboard/data-access/use-dashboard-activity-query';
import { useDashboardAlertsQuery } from '@/features/dashboard/data-access/use-dashboard-alerts-query';
import { useDashboardEmployeesQuery } from '@/features/dashboard/data-access/use-dashboard-employees-query';
import { useDashboardStreamsQuery } from '@/features/dashboard/data-access/use-dashboard-streams-query';
import { getAccountStateConfig } from '@/lib/config/account-states';
import {
  deriveOverviewMetrics,
  deriveSecondaryMetrics,
  toTimelineEvents,
  type OverviewMetric,
  type SecondaryMetric,
  type TimelineEvent,
} from '@/lib/dashboard/stream-insights';
import { hasPositiveTokenBalance, NULL_ADDRESS } from '@/lib/solana/token-helpers';
import type { DashboardStream } from '@/types/stream';

import { useDashboard } from '../dashboard-context';
import { EmptyState } from '../empty-state';
import { OverviewActivityTimeline } from '../overview/overview-activity-timeline';
import { OverviewAlerts } from '../overview/overview-alerts';
import { OverviewChecklist, type OverviewChecklistStep } from '../overview/overview-checklist';
import { OverviewMetrics } from '../overview/overview-metrics';

interface OverviewTabProps {
  initialStreams: DashboardStream[];
  initialActivity: ActivityLogEntry[];
}

export function OverviewTab({ initialStreams, initialActivity }: OverviewTabProps) {
  const {
    accountState,
    openCreateStreamModal,
    openAddEmployeeModal,
    openTopUpAccountModal,
    setupProgress,
    completeSetupStep,
  } = useDashboard();
  const { account } = useWalletUi();
  const { data: streamData = [], isFetching: streamsFetching } = useDashboardStreamsQuery({
    initialData: initialStreams,
  });
  const { data: employees = [] } = useDashboardEmployeesQuery();
  const {
    data: activityEntries = [],
    isFetching: activityFetching,
    error: activityError,
  } = useDashboardActivityQuery({ initialData: initialActivity, limit: 10 });
  const walletAddress = (account?.address as Address) ?? NULL_ADDRESS;
  const balanceQuery = useGetBalanceQuery({ address: walletAddress, enabled: Boolean(account?.address) });
  const tokenAccountsQuery = useGetTokenAccountsQuery({ address: walletAddress, enabled: Boolean(account?.address) });
  const hasOnChainTokenBalance = useMemo(
    () => hasPositiveTokenBalance(tokenAccountsQuery.data),
    [tokenAccountsQuery.data],
  );
  const hasVaultBalance = useMemo(() => streamData.some((stream) => stream.vaultBalance > 0), [streamData]);
  const lamportsRaw = balanceQuery.data?.value;
  const solBalanceLamports = typeof lamportsRaw === 'bigint' ? lamportsRaw : BigInt(lamportsRaw ?? 0);
  const hasSolBalance = solBalanceLamports > BigInt(0);
  const hasTreasuryFunding = hasOnChainTokenBalance || hasSolBalance || hasVaultBalance;
  const walletConnected = setupProgress.walletConnected || Boolean(account?.address);
  const hasEmployeeRecords = employees.length > 0;
  const hasStreamRecords = streamData.length > 0;
  const tokenFundingComplete = setupProgress.tokenAccountFunded || hasTreasuryFunding;
  const tokenFundingOptional = !setupProgress.tokenAccountFunded && hasTreasuryFunding;
  const employeeStepComplete = setupProgress.employeeAdded || hasEmployeeRecords;
  const streamStepComplete = setupProgress.streamCreated || hasStreamRecords;
  const setupComplete = walletConnected && employeeStepComplete && streamStepComplete;

  useEffect(() => {
    if (!walletConnected || setupProgress.tokenAccountFunded || !hasTreasuryFunding) return;
    completeSetupStep('tokenAccountFunded');
  }, [completeSetupStep, hasTreasuryFunding, setupProgress.tokenAccountFunded, walletConnected]);

  const config = getAccountStateConfig(accountState);
  const hasStreams = hasStreamRecords || config.hasStreams;
  const showSetupPhase = !setupComplete;

  const metrics = useMemo<OverviewMetric[]>(() => deriveOverviewMetrics(streamData), [streamData]);
  const { data: alerts = [] } = useDashboardAlertsQuery({ status: 'all' });
  const secondaryMetrics = useMemo<SecondaryMetric[]>(
    () => deriveSecondaryMetrics(streamData, activityEntries),
    [streamData, activityEntries],
  );
  const timelineEvents = useMemo<TimelineEvent[]>(() => toTimelineEvents(activityEntries), [activityEntries]);

  const checklistSteps = useMemo<OverviewChecklistStep[]>(
    () => [
      {
        id: 'wallet',
        title: 'Connect employer wallet',
        description: 'Link the treasury wallet used to fund ongoing payroll streams.',
        completed: walletConnected,
        stepNumber: 1,
      },
      {
        id: 'token-account',
        title: 'Verify token account funding',
        description: 'Confirm your default token account has enough balance for upcoming payroll.',
        completed: tokenFundingComplete,
        stepNumber: 2,
        optional: tokenFundingOptional,
        action: tokenFundingComplete
          ? undefined
          : {
              label: 'Top Up Account',
              onClick: openTopUpAccountModal,
            },
      },
      {
        id: 'employee',
        title: 'Add first employee',
        description: 'Invite or create an employee profile with a wallet address.',
        completed: employeeStepComplete,
        stepNumber: 3,
        action: employeeStepComplete
          ? undefined
          : {
              label: 'Add Employee',
              onClick: openAddEmployeeModal,
            },
      },
      {
        id: 'stream',
        title: 'Create payment stream',
        description: 'Launch the first live payment stream for your team member.',
        completed: streamStepComplete,
        stepNumber: 4,
        action: streamStepComplete
          ? undefined
          : {
              label: 'Create Stream',
              onClick: () => openCreateStreamModal(),
              disabled: !employeeStepComplete || !tokenFundingComplete,
            },
      },
    ],
    [
      walletConnected,
      employeeStepComplete,
      streamStepComplete,
      tokenFundingComplete,
      tokenFundingOptional,
      openAddEmployeeModal,
      openCreateStreamModal,
      openTopUpAccountModal,
    ],
  );

  const primaryCta = useMemo(() => {
    if (!walletConnected) return null;
    if (!employeeStepComplete) {
      return {
        label: 'Add Employee',
        onClick: openAddEmployeeModal,
      };
    }
    if (!streamStepComplete) {
      return {
        label: 'Create Stream',
        onClick: () => openCreateStreamModal(),
        disabled: !tokenFundingComplete,
      };
    }
    return null;
  }, [
    openAddEmployeeModal,
    openCreateStreamModal,
    employeeStepComplete,
    streamStepComplete,
    tokenFundingComplete,
    walletConnected,
  ]);

  return (
    <div className="space-y-4 sm:space-y-5 md:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Overview</h1>
        <p className="text-xs text-muted-foreground sm:text-sm">Manage your payment streams and employee payroll</p>
      </div>

      {/* Empty state with setup checklist */}
      {showSetupPhase && (
        <div className="space-y-4 sm:space-y-5 md:space-y-6">
          <Card className="border-2 border-dashed">
            <CardContent className="pt-6 sm:pt-8">
              <div className="space-y-3 text-center sm:space-y-4">
                <div className="flex justify-center">
                  <Zap className="h-10 w-10 text-muted-foreground sm:h-12 sm:w-12" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold sm:text-xl">Get started with your first payment stream</h2>
                  <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                    Complete the setup checklist below to enable payment streams
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <OverviewChecklist steps={checklistSteps} />

          {primaryCta ? (
            <div className="flex flex-col items-center gap-2">
              <Button size="lg" onClick={primaryCta.onClick} disabled={primaryCta.disabled}>
                {primaryCta.label}
              </Button>
              {primaryCta.disabled ? (
                <p className="text-xs text-muted-foreground">Fund your token account to enable stream creation.</p>
              ) : null}
            </div>
          ) : null}
        </div>
      )}

      {/* Wallet connected but no streams yet */}
      {!showSetupPhase && !hasStreams && (
        <div className="space-y-4 sm:space-y-5 md:space-y-6">
          <EmptyState
            icon={<Zap className="h-10 w-10 text-muted-foreground sm:h-12 sm:w-12" />}
            title="Ready to create your first stream"
            description="Your wallet is connected. Create your first payment stream to get started with employee payroll."
            action={{
              label: 'Create First Stream',
              onClick: () => openCreateStreamModal(),
            }}
          />
        </div>
      )}

      {/* Active state with metrics and alerts */}
      {!showSetupPhase && hasStreams && (
        <div className="space-y-4 sm:space-y-5 md:space-y-6">
          {/* KPI Row */}
          {config.showMetrics && <OverviewMetrics metrics={metrics} isLoading={streamsFetching} />}

          {/* Secondary metrics grid */}
          {config.showSecondaryMetrics && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
              {secondaryMetrics.map((metric) => {
                const IconComponent =
                  metric.icon === 'alert'
                    ? AlertCircle
                    : metric.icon === 'trending-down'
                      ? TrendingDown
                      : metric.icon === 'zap'
                        ? Zap
                        : Users;

                return (
                  <Card key={metric.id}>
                    <CardHeader className="pb-2 sm:pb-3">
                      <CardTitle className="flex items-center gap-2 text-xs font-medium sm:text-sm">
                        <IconComponent className="h-3 w-3 shrink-0 sm:h-4 sm:w-4" />
                        <span className="truncate">{metric.label}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xl font-bold sm:text-2xl">{metric.value}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{metric.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Activity and Alerts */}
          {(config.showActivityTimeline || config.showAlerts) && (
            <div className="grid grid-cols-1 gap-4 sm:gap-5 md:gap-6 lg:grid-cols-3">
              {config.showActivityTimeline ? (
                <div className="lg:col-span-2">
                  <OverviewActivityTimeline
                    events={timelineEvents}
                    isLoading={activityFetching}
                    error={activityError instanceof Error ? activityError : null}
                  />
                </div>
              ) : null}
              {config.showAlerts ? (
                <div>
                  <OverviewAlerts
                    alerts={alerts}
                    onCreateStream={() => openCreateStreamModal()}
                    onAddEmployee={openAddEmployeeModal}
                    hasSetupProgress={setupProgress.employeeAdded}
                    isFundingReady={setupProgress.tokenAccountFunded}
                  />
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
