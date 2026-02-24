import { differenceInHours, parseISO } from 'date-fns';

import type { ActivityLogEntry } from '@/features/organization/server/actions/activity-log';
import type { DashboardStream } from '@/types/stream';

const CURRENCY_FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const NUMBER_FORMATTER = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

export type OverviewMetric = {
  id: string;
  label: string;
  value: string;
  tooltip: string;
};

export type OverviewAlertLevel = 'critical' | 'high' | 'medium';

export type OverviewAlert = {
  id: string;
  level: OverviewAlertLevel;
  title: string;
  description: string;
};

export type TimelineEvent = {
  id: string;
  category: 'Funding' | 'Employee' | 'System';
  title: string;
  description: string | null;
  occurredAt: string;
  actor: string | null;
};

const STREAM_ACTIVITY_CATEGORY_MAP: Record<string, TimelineEvent['category']> = {
  stream_created: 'System',
  stream_top_up: 'Funding',
  stream_withdrawn: 'Funding',
  stream_refresh_activity: 'System',
  stream_emergency_withdraw: 'Funding',
  stream_closed: 'System',
  stream_reactivated: 'System',
};

function parseHoursSince(dateIso?: string | null): number | null {
  if (!dateIso) return null;
  try {
    return differenceInHours(new Date(), parseISO(dateIso));
  } catch (error) {
    console.warn('[dashboard] Failed to parse date for insight calculation', error);
    return null;
  }
}

function sum(values: Array<number>): number {
  return values.reduce((total, value) => total + (Number.isFinite(value) ? value : 0), 0);
}

function calculateMonthlyBurn(streams: DashboardStream[]): number {
  const hourlyTotal = sum(streams.map((stream) => stream.hourlyRate));
  return hourlyTotal * 24 * 30;
}

function calculateVaultCoverageDays(streams: DashboardStream[]): number | null {
  const hourlyTotal = sum(streams.map((stream) => stream.hourlyRate));
  if (hourlyTotal <= 0) return null;
  const vaultTotal = sum(streams.map((stream) => stream.vaultBalance));
  const coverageHours = vaultTotal / hourlyTotal;
  if (!Number.isFinite(coverageHours) || coverageHours <= 0) return null;
  return coverageHours / 24;
}

export function deriveOverviewMetrics(streams: DashboardStream[]): OverviewMetric[] {
  const activeStreams = streams.filter((stream) => stream.status === 'active');
  const monthlyBurn = calculateMonthlyBurn(activeStreams);
  const totalDeposited = sum(streams.map((stream) => stream.totalDeposited));
  const coverageDays = calculateVaultCoverageDays(activeStreams);

  return [
    {
      id: 'active-streams',
      label: 'Active Streams',
      value: activeStreams.length.toString(),
      tooltip: 'Count of streams with status set to active.',
    },
    {
      id: 'monthly-burn',
      label: 'Monthly Burn',
      value: CURRENCY_FORMATTER.format(monthlyBurn),
      tooltip: 'Σ(hourly_rate × 24 × 30) across active streams.',
    },
    {
      id: 'total-deposited',
      label: 'Total Deposited',
      value: CURRENCY_FORMATTER.format(totalDeposited),
      tooltip: 'Total tokens deposited into employer-controlled vault accounts.',
    },
    {
      id: 'vault-coverage',
      label: 'Vault Coverage',
      value: coverageDays != null ? `${NUMBER_FORMATTER.format(coverageDays)} days` : 'N/A',
      tooltip: 'Vault balance divided by aggregate hourly rate, expressed in days.',
    },
  ];
}

export function deriveOverviewAlerts(streams: DashboardStream[]): OverviewAlert[] {
  if (streams.length === 0) return [];

  const alerts: OverviewAlert[] = [];

  const lowRunway = streams.filter((stream) => {
    if (stream.hourlyRate <= 0) return false;
    const hourlySpend = stream.hourlyRate;
    const runwayHours = stream.vaultBalance / hourlySpend;
    return Number.isFinite(runwayHours) && runwayHours > 0 && runwayHours <= 72;
  });

  if (lowRunway.length > 0) {
    alerts.push({
      id: 'low-runway',
      level: 'critical',
      title: 'Critical runway',
      description: `${lowRunway.length} stream${lowRunway.length === 1 ? '' : 's'} fall below 72 hours of funding.`,
    });
  }

  const inactiveStreams = streams.filter((stream) => {
    const hoursSinceActivity = parseHoursSince(stream.lastActivityAt);
    return hoursSinceActivity != null && hoursSinceActivity >= 24 * 25;
  });

  if (inactiveStreams.length > 0) {
    alerts.push({
      id: 'inactive-streams',
      level: 'high',
      title: 'Streams inactive',
      description: `${inactiveStreams.length} stream${inactiveStreams.length === 1 ? '' : 's'} show no activity for 25+ days.`,
    });
  }

  const suspendedStreams = streams.filter((stream) => stream.status === 'suspended');
  if (suspendedStreams.length > 0) {
    alerts.push({
      id: 'suspended-streams',
      level: 'medium',
      title: 'Suspended streams',
      description: `${suspendedStreams.length} stream${suspendedStreams.length === 1 ? '' : 's'} are currently suspended.`,
    });
  }

  return alerts;
}

export function toTimelineEvents(entries: ActivityLogEntry[]): TimelineEvent[] {
  return entries.map((entry) => {
    const category =
      entry.activityType && entry.activityType in STREAM_ACTIVITY_CATEGORY_MAP
        ? STREAM_ACTIVITY_CATEGORY_MAP[entry.activityType]
        : 'System';

    return {
      id: entry.id,
      category,
      title: entry.title,
      description: entry.description ?? null,
      occurredAt: entry.occurredAt,
      actor: entry.actorAddress ?? entry.actorType ?? null,
    } satisfies TimelineEvent;
  });
}

export type SecondaryMetric = {
  id: string;
  label: string;
  value: string | number;
  description: string;
  icon: 'alert' | 'trending-down' | 'zap' | 'users';
};

/**
 * Calculate secondary metrics for the overview dashboard
 */
export function deriveSecondaryMetrics(streams: DashboardStream[], activities: ActivityLogEntry[]): SecondaryMetric[] {
  // Count pending actions (streams with low runway + inactive streams)
  const lowRunwayCount = streams.filter((stream) => {
    if (stream.hourlyRate <= 0) return false;
    const runwayHours = stream.vaultBalance / stream.hourlyRate;
    return Number.isFinite(runwayHours) && runwayHours > 0 && runwayHours <= 72;
  }).length;

  const suspendedCount = streams.filter((stream) => stream.status === 'suspended').length;
  const pendingActions = lowRunwayCount + suspendedCount;

  // Count inactivity risk (25+ days inactive)
  const inactivityRiskCount = streams.filter((stream) => {
    const hoursSinceActivity = parseHoursSince(stream.lastActivityAt);
    return hoursSinceActivity != null && hoursSinceActivity >= 24 * 25;
  }).length;

  // Count emergency withdrawals (clawbacks) in last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const clawbackCount = activities.filter((activity) => {
    const activityDate = parseISO(activity.occurredAt);
    return activity.activityType === 'stream_emergency_withdraw' && activityDate >= thirtyDaysAgo;
  }).length;

  // Calculate token health (percentage of streams with adequate funding)
  const activeStreams = streams.filter((stream) => stream.status === 'active');
  const healthyStreams = activeStreams.filter((stream) => {
    if (stream.hourlyRate <= 0) return true;
    const runwayHours = stream.vaultBalance / stream.hourlyRate;
    return Number.isFinite(runwayHours) && runwayHours > 72; // More than 3 days
  }).length;
  const tokenHealthPercentage =
    activeStreams.length > 0 ? Math.round((healthyStreams / activeStreams.length) * 100) : 100;

  return [
    {
      id: 'pending-actions',
      label: 'Pending Actions',
      value: pendingActions,
      description: 'Require attention',
      icon: 'alert',
    },
    {
      id: 'inactivity-risk',
      label: 'Inactivity Risk',
      value: inactivityRiskCount,
      description: '25+ days inactive',
      icon: 'trending-down',
    },
    {
      id: 'clawbacks',
      label: 'Clawbacks (30d)',
      value: clawbackCount,
      description: 'Emergency withdrawals',
      icon: 'zap',
    },
    {
      id: 'token-health',
      label: 'Token Health',
      value: `${tokenHealthPercentage}%`,
      description: 'Above threshold',
      icon: 'users',
    },
  ];
}
