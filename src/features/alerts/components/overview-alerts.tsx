'use client';

import { Check, Flame, ShieldAlert, Sparkles, UserPlus, X } from 'lucide-react';

import type { alertSeverityEnum } from '@/core/db/schema';
import { Button } from '@/core/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/core/ui/card';
import {
  useAcknowledgeAlertMutation,
  useDismissAlertMutation,
  useResolveAlertMutation,
} from '@/features/alerts/client/mutations/use-alert-mutations';
import type { DashboardAlert } from '@/features/alerts/server/actions/alerts';

type AlertSeverity = (typeof alertSeverityEnum)['enumValues'][number];

const LEVEL_LABELS: Record<AlertSeverity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

const LEVEL_STYLES: Record<AlertSeverity, { container: string; badge: string; icon: typeof ShieldAlert }> = {
  critical: {
    container: 'border-destructive/40 bg-destructive/10',
    badge: 'bg-destructive/15 text-destructive border border-destructive/20',
    icon: ShieldAlert,
  },
  high: {
    container: 'border-amber-500/40 bg-amber-500/10',
    badge: 'bg-amber-500/15 text-amber-600 border border-amber-500/20',
    icon: Flame,
  },
  medium: {
    container: 'border-sky-500/40 bg-sky-500/10',
    badge: 'bg-sky-500/15 text-sky-600 border border-sky-500/20',
    icon: Sparkles,
  },
  low: {
    container: 'border-muted-foreground/20 bg-muted/30',
    badge: 'bg-muted border border-muted-foreground/20',
    icon: Sparkles,
  },
};

export function OverviewAlerts({
  alerts,
  onCreateStream,
  onAddEmployee,
  hasSetupProgress,
  isFundingReady,
}: {
  alerts: DashboardAlert[];
  onCreateStream: () => void;
  onAddEmployee: () => void;
  hasSetupProgress: boolean;
  isFundingReady: boolean;
}) {
  const acknowledgeAlert = useAcknowledgeAlertMutation();
  const resolveAlert = useResolveAlertMutation();
  const dismissAlert = useDismissAlertMutation();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Alerts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.length > 0 ? (
          alerts.map((alert) => {
            const styles = LEVEL_STYLES[alert.severity];
            const Icon = styles.icon;
            const isAcknowledged = alert.status === 'acknowledged';

            return (
              <div key={alert.id} className={`flex items-start gap-3 rounded-lg border px-3 py-3 ${styles.container}`}>
                <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="flex-1 text-sm leading-tight font-semibold">{alert.title}</p>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles.badge}`}>
                      {LEVEL_LABELS[alert.severity]}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{alert.description}</p>

                  {/* Action buttons */}
                  <div className="mt-2 flex gap-2">
                    {!isAcknowledged && (
                      <button
                        className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors hover:bg-muted"
                        onClick={() => acknowledgeAlert.mutate(alert.id)}
                        disabled={acknowledgeAlert.isPending}
                      >
                        <Check className="h-3 w-3" />
                        Acknowledge
                      </button>
                    )}
                    <button
                      className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors hover:bg-muted"
                      onClick={() => resolveAlert.mutate(alert.id)}
                      disabled={resolveAlert.isPending}
                    >
                      <Check className="h-3 w-3" />
                      Resolve
                    </button>
                    <button
                      className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors hover:bg-muted"
                      onClick={() => dismissAlert.mutate(alert.id)}
                      disabled={dismissAlert.isPending}
                    >
                      <X className="h-3 w-3" />
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : hasSetupProgress ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-muted-foreground/40 bg-muted/10 px-4 py-6 text-center">
            <Sparkles className="h-5 w-5 text-muted-foreground" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">No alerts right now</p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Keep your treasury funded and we&apos;ll highlight any risks as they appear.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={onCreateStream}
              disabled={!hasSetupProgress || !isFundingReady}
            >
              Create Stream
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-muted-foreground/40 bg-muted/10 px-4 py-6 text-center">
            <UserPlus className="h-5 w-5 text-muted-foreground" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Add your first employee</p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Invite a team member to start receiving payroll alerts here.
              </p>
            </div>
            <Button size="sm" onClick={onAddEmployee}>
              Add Employee
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
