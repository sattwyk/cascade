'use client';

import { useMemo } from 'react';

import { AlertCircle, TrendingDown, Users, Zap } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getAccountStateConfig } from '@/lib/config/account-states';

import { useDashboard } from '../dashboard-context';
import { EmptyState } from '../empty-state';
import { OverviewActivityTimeline } from '../overview/overview-activity-timeline';
import { OverviewAlerts } from '../overview/overview-alerts';
import { OverviewChecklist, type OverviewChecklistStep } from '../overview/overview-checklist';
import { OverviewMetrics } from '../overview/overview-metrics';

export function OverviewTab() {
  const {
    accountState,
    setIsCreateStreamModalOpen,
    setIsAddEmployeeModalOpen,
    setIsTopUpAccountModalOpen,
    setupProgress,
  } = useDashboard();

  const config = getAccountStateConfig(accountState);
  const hasStreams = config.hasStreams;
  const showSetupPhase = !config.setupComplete;

  const checklistSteps = useMemo<OverviewChecklistStep[]>(
    () => [
      {
        id: 'wallet',
        title: 'Connect employer wallet',
        description: 'Link the treasury wallet used to fund ongoing payroll streams.',
        completed: setupProgress.walletConnected,
        stepNumber: 1,
      },
      {
        id: 'token-account',
        title: 'Verify token account funding',
        description: 'Confirm your default token account has enough balance for upcoming payroll.',
        completed: setupProgress.tokenAccountFunded,
        stepNumber: 2,
        action: setupProgress.tokenAccountFunded
          ? undefined
          : {
              label: 'Top Up Account',
              onClick: () => setIsTopUpAccountModalOpen(true),
            },
      },
      {
        id: 'employee',
        title: 'Add first employee',
        description: 'Invite or create an employee profile with a wallet address.',
        completed: setupProgress.employeeAdded,
        stepNumber: 3,
        action: setupProgress.employeeAdded
          ? undefined
          : {
              label: 'Add Employee',
              onClick: () => setIsAddEmployeeModalOpen(true),
            },
      },
      {
        id: 'stream',
        title: 'Create payment stream',
        description: 'Launch the first live payment stream for your team member.',
        completed: setupProgress.streamCreated,
        stepNumber: 4,
        action: setupProgress.streamCreated
          ? undefined
          : {
              label: 'Create Stream',
              onClick: () => setIsCreateStreamModalOpen(true),
              disabled: !setupProgress.employeeAdded || !setupProgress.tokenAccountFunded,
            },
      },
    ],
    [
      setIsAddEmployeeModalOpen,
      setIsCreateStreamModalOpen,
      setIsTopUpAccountModalOpen,
      setupProgress.employeeAdded,
      setupProgress.streamCreated,
      setupProgress.tokenAccountFunded,
      setupProgress.walletConnected,
    ],
  );

  const primaryCta = useMemo(() => {
    if (!setupProgress.walletConnected) return null;
    if (!setupProgress.employeeAdded) {
      return {
        label: 'Add Employee',
        onClick: () => setIsAddEmployeeModalOpen(true),
      };
    }
    if (!setupProgress.streamCreated) {
      return {
        label: 'Create Stream',
        onClick: () => setIsCreateStreamModalOpen(true),
        disabled: !setupProgress.tokenAccountFunded,
      };
    }
    return null;
  }, [
    setIsAddEmployeeModalOpen,
    setIsCreateStreamModalOpen,
    setupProgress.employeeAdded,
    setupProgress.streamCreated,
    setupProgress.tokenAccountFunded,
    setupProgress.walletConnected,
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
              onClick: () => setIsCreateStreamModalOpen(true),
            }}
          />
        </div>
      )}

      {/* Active state with metrics and alerts */}
      {!showSetupPhase && hasStreams && (
        <div className="space-y-4 sm:space-y-5 md:space-y-6">
          {/* KPI Row */}
          {config.showMetrics && <OverviewMetrics />}

          {/* Secondary metrics grid */}
          {config.showSecondaryMetrics && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2 sm:pb-3">
                  <CardTitle className="flex items-center gap-2 text-xs font-medium sm:text-sm">
                    <AlertCircle className="h-3 w-3 shrink-0 sm:h-4 sm:w-4" />
                    <span className="truncate">Pending Actions</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xl font-bold sm:text-2xl">2</p>
                  <p className="mt-1 text-xs text-muted-foreground">Require attention</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 sm:pb-3">
                  <CardTitle className="flex items-center gap-2 text-xs font-medium sm:text-sm">
                    <TrendingDown className="h-3 w-3 shrink-0 sm:h-4 sm:w-4" />
                    <span className="truncate">Inactivity Risk</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xl font-bold sm:text-2xl">1</p>
                  <p className="mt-1 text-xs text-muted-foreground">25+ days inactive</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 sm:pb-3">
                  <CardTitle className="flex items-center gap-2 text-xs font-medium sm:text-sm">
                    <Zap className="h-3 w-3 shrink-0 sm:h-4 sm:w-4" />
                    <span className="truncate">Clawbacks (30d)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xl font-bold sm:text-2xl">0</p>
                  <p className="mt-1 text-xs text-muted-foreground">Emergency withdrawals</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 sm:pb-3">
                  <CardTitle className="flex items-center gap-2 text-xs font-medium sm:text-sm">
                    <Users className="h-3 w-3 shrink-0 sm:h-4 sm:w-4" />
                    <span className="truncate">Token Health</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xl font-bold sm:text-2xl">100%</p>
                  <p className="mt-1 text-xs text-muted-foreground">Above threshold</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Activity and Alerts */}
          {(config.showActivityTimeline || config.showAlerts) && (
            <div className="grid grid-cols-1 gap-4 sm:gap-5 md:gap-6 lg:grid-cols-3">
              {config.showActivityTimeline && (
                <div className="lg:col-span-2">
                  <OverviewActivityTimeline />
                </div>
              )}
              {config.showAlerts && (
                <div>
                  <OverviewAlerts />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
