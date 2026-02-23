'use client';

import { formatDistanceToNow } from 'date-fns';
import { Loader2 } from 'lucide-react';

import { Card, CardContent } from '@/core/ui/card';
import { useStreamActivityQuery } from '@/features/streams/client/queries/use-stream-activity-query';

interface StreamActivityHistoryProps {
  streamId: string;
}

export function StreamActivityHistory({ streamId }: StreamActivityHistoryProps) {
  const { data: activities, isLoading, isError } = useStreamActivityQuery({ streamId });
  const amountFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="py-8 text-center text-sm text-muted-foreground">Failed to load activity history</p>
        </CardContent>
      </Card>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="py-8 text-center text-sm text-muted-foreground">No activity recorded yet</p>
        </CardContent>
      </Card>
    );
  }

  const formatAmount = (metadata: Record<string, unknown>) => {
    if (metadata.amount && typeof metadata.amount === 'number') {
      return amountFormatter.format(metadata.amount);
    }
    return null;
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-3">
          {activities.map((activity) => {
            const amount = formatAmount(activity.metadata);
            const timestamp = formatDistanceToNow(new Date(activity.occurredAt), { addSuffix: true });

            return (
              <div
                key={activity.id}
                className="flex items-start justify-between border-b border-border pb-3 last:border-0"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium">{activity.title}</p>
                  {activity.description && <p className="mt-1 text-xs text-muted-foreground">{activity.description}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">{timestamp}</p>
                </div>
                {amount && <p className="text-sm font-semibold">{amount}</p>}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
