'use client';

import { getAllAccountStates } from '@/core/config/account-states';
import { Button } from '@/core/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/core/ui/card';
import { useDashboard } from '@/features/organization/components/layout/employer-dashboard-context';

export function SettingsAccountState() {
  const { accountState, setAccountState } = useDashboard();
  const states = getAllAccountStates();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account State (Development)</CardTitle>
        <CardDescription>
          Switch between different account states to preview the dashboard at different stages of setup
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">
            Current State: <span className="font-bold text-primary">{accountState}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            This controls which features and UI elements are visible in the dashboard
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {states.map((state) => (
            <Button
              key={state.state}
              variant={accountState === state.state ? 'default' : 'outline'}
              onClick={() => setAccountState(state.state)}
              className="h-auto justify-start px-4 py-3 text-left"
            >
              <div>
                <div className="font-medium">{state.label}</div>
                <div className="text-xs opacity-75">{state.description}</div>
              </div>
            </Button>
          ))}
        </div>

        <div className="mt-6 space-y-2 rounded-lg bg-muted p-4">
          <h4 className="text-sm font-medium">State Details</h4>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>
              • Onboarding:{' '}
              {getAllAccountStates().find((s) => s.state === accountState)?.showOnboarding ? 'Visible' : 'Hidden'}
            </p>
            <p>
              • Metrics:{' '}
              {getAllAccountStates().find((s) => s.state === accountState)?.showMetrics ? 'Visible' : 'Hidden'}
            </p>
            <p>
              • Activity Timeline:{' '}
              {getAllAccountStates().find((s) => s.state === accountState)?.showActivityTimeline ? 'Visible' : 'Hidden'}
            </p>
            <p>
              • Alerts: {getAllAccountStates().find((s) => s.state === accountState)?.showAlerts ? 'Visible' : 'Hidden'}
            </p>
            <p>
              • Streams Tab:{' '}
              {getAllAccountStates().find((s) => s.state === accountState)?.showStreamsTab ? 'Visible' : 'Hidden'}
            </p>
            <p>
              • Employees Tab:{' '}
              {getAllAccountStates().find((s) => s.state === accountState)?.showEmployeesTab ? 'Visible' : 'Hidden'}
            </p>
            <p>
              • Reports Tab:{' '}
              {getAllAccountStates().find((s) => s.state === accountState)?.showReportsTab ? 'Visible' : 'Hidden'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
