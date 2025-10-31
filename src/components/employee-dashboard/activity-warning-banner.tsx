'use client';

import { useState } from 'react';

import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';

import { useEmployeeDashboard } from './employee-dashboard-context';

type WarningSeverity = 'critical' | 'warning' | 'caution';

interface ActivityWarningBannerProps {
  lastActivityDate: Date | null;
  daysUntilWithdrawal: number;
  variant?: 'auto' | WarningSeverity;
  forceVisible?: boolean;
  overrideDaysUntilWithdrawal?: number;
}

const severityStyles: Record<
  WarningSeverity,
  { bg: string; text: string; subtext: string; icon: string; button: string }
> = {
  critical: {
    bg: 'bg-red-50 border-red-200',
    text: 'text-red-900',
    subtext: 'text-red-700',
    icon: 'text-red-600',
    button: 'bg-red-600 hover:bg-red-700 text-white',
  },
  warning: {
    bg: 'bg-yellow-50 border-yellow-200',
    text: 'text-yellow-900',
    subtext: 'text-yellow-700',
    icon: 'text-yellow-600',
    button: 'bg-yellow-600 hover:bg-yellow-700 text-white',
  },
  caution: {
    bg: 'bg-orange-50 border-orange-200',
    text: 'text-orange-900',
    subtext: 'text-orange-700',
    icon: 'text-orange-600',
    button: 'bg-orange-600 hover:bg-orange-700 text-white',
  },
};

const severityHeadlines: Record<WarningSeverity, string> = {
  critical: 'Urgent: Refresh Activity Immediately',
  warning: 'Action Needed Soon',
  caution: 'Stay Active to Keep Funds Protected',
};

const severityMessages = (days: number): Record<WarningSeverity, string> => {
  const daysLabel = `${Math.max(days, 0)} day${Math.max(days, 0) === 1 ? '' : 's'}`;

  return {
    critical: `Your employer can withdraw funds in ${daysLabel}! Refresh immediately to stay protected.`,
    warning: `Your employer will be able to withdraw funds in ${daysLabel}. Refresh soon to keep your funds safe.`,
    caution: `You're ${daysLabel} away from your employer regaining withdrawal access. Refresh regularly to stay ahead.`,
  };
};

export function ActivityWarningBanner({
  lastActivityDate,
  daysUntilWithdrawal,
  variant = 'auto',
  forceVisible = false,
  overrideDaysUntilWithdrawal,
}: ActivityWarningBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isRefreshingLocal, setIsRefreshingLocal] = useState(false);
  const { refreshActivityHandler, isRefreshingActivity } = useEmployeeDashboard();

  const effectiveDaysUntilWithdrawal = overrideDaysUntilWithdrawal ?? daysUntilWithdrawal;

  // Don't show if dismissed or if we have plenty of time (more than 7 days)
  if (isDismissed || (!forceVisible && effectiveDaysUntilWithdrawal > 7)) {
    return null;
  }

  const handleRefreshActivity = async () => {
    if (!refreshActivityHandler) {
      toast.error('Unable to refresh activity right now.');
      return;
    }

    setIsRefreshingLocal(true);
    try {
      await refreshActivityHandler();
      setIsDismissed(true);
    } catch (error) {
      console.error('Refresh failed:', error);
      // Error toast already handled by the mutation layer.
    } finally {
      setIsRefreshingLocal(false);
    }
  };

  const isRefreshing = isRefreshingActivity || isRefreshingLocal;

  const resolvedSeverity: WarningSeverity = (() => {
    if (variant !== 'auto') {
      return variant;
    }
    if (effectiveDaysUntilWithdrawal <= 3) {
      return 'critical';
    }
    if (effectiveDaysUntilWithdrawal <= 7) {
      return 'warning';
    }
    return 'caution';
  })();

  const styles = severityStyles[resolvedSeverity];
  const message = severityMessages(effectiveDaysUntilWithdrawal)[resolvedSeverity];
  const lastActivityText = lastActivityDate
    ? lastActivityDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Unknown';

  return (
    <div className={`relative flex items-start gap-4 rounded-lg border p-4 ${styles.bg}`}>
      <AlertTriangle className={`h-5 w-5 shrink-0 ${styles.icon}`} />

      <div className="flex-1 space-y-1">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className={`font-semibold ${styles.text}`}>{severityHeadlines[resolvedSeverity]}</h3>
            <p className={`text-sm ${styles.subtext}`}>
              Your last activity was on <strong>{lastActivityText}</strong>. {message}
            </p>
            <p className={`mt-1 text-xs ${styles.subtext}`}>
              Refresh your activity to prevent emergency withdrawal by your employer.
            </p>
          </div>

          <Button
            size="sm"
            className={`shrink-0 gap-2 ${styles.button}`}
            onClick={handleRefreshActivity}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Now
          </Button>
        </div>
      </div>

      <button
        onClick={() => setIsDismissed(true)}
        className={`shrink-0 rounded-sm opacity-70 hover:opacity-100 ${styles.icon}`}
        aria-label="Dismiss warning"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
