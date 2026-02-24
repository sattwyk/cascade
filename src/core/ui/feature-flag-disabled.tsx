import { Lock } from 'lucide-react';

import { Card } from '@/core/ui/card';

type DashboardFeatureFlagDisabledProps = {
  title: string;
  description?: string;
};

export function DashboardFeatureFlagDisabled({ title, description }: DashboardFeatureFlagDisabledProps) {
  return (
    <Card className="mx-auto max-w-3xl p-8">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Lock className="h-5 w-5 text-muted-foreground" />
        </div>

        <div className="space-y-1">
          <h1 className="text-xl font-semibold">{title} is currently disabled</h1>
          <p className="text-sm text-muted-foreground">
            {description ?? 'This dashboard view is controlled by a feature flag and is currently turned off.'}
          </p>
        </div>
      </div>
    </Card>
  );
}
