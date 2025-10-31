'use client';

import { useMemo, useState } from 'react';

import { ChevronDown } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { TimelineEvent } from '@/lib/dashboard/stream-insights';

const CATEGORY_COLOR_MAP: Record<TimelineEvent['category'], string> = {
  Funding: 'bg-blue-500/10 text-blue-700',
  Employee: 'bg-purple-500/10 text-purple-700',
  System: 'bg-gray-500/10 text-gray-700',
};

export function OverviewActivityTimeline({
  events,
  isLoading,
  error,
}: {
  events: TimelineEvent[];
  isLoading?: boolean;
  error?: Error | null;
}) {
  const [selectedFilter, setSelectedFilter] = useState<'All' | TimelineEvent['category']>('All');

  const filters = useMemo(() => {
    const categories = new Set<TimelineEvent['category']>();
    events.forEach((event) => categories.add(event.category));
    return ['All', ...Array.from(categories)];
  }, [events]);

  const filteredEvents = useMemo(() => {
    if (selectedFilter === 'All') return events;
    return events.filter((event) => event.category === selectedFilter);
  }, [events, selectedFilter]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-wrap gap-2">
          {filters.map((filter) => (
            <Button
              key={filter}
              variant={selectedFilter === filter ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedFilter(filter as typeof selectedFilter)}
              disabled={isLoading}
            >
              {filter}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex gap-4 border-b border-border pb-3 last:border-0">
                <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-muted" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                  <div className="h-5 w-16 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error.message}</p>
        ) : filteredEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent activity recorded.</p>
        ) : (
          <div className="space-y-3">
            {filteredEvents.map((event) => (
              <div key={event.id} className="flex gap-4 border-b border-border pb-3 last:border-0">
                <div className="mt-1 shrink-0">
                  <div className={`h-2 w-2 rounded-full ${CATEGORY_COLOR_MAP[event.category].split(' ')[0]}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{event.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {event.actor ? `${event.actor} • ` : ''}
                        {new Date(event.occurredAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {event.description ? <p className="mt-1 text-xs text-muted-foreground">{event.description}</p> : null}
                  <Badge variant="secondary" className={`mt-2 text-xs ${CATEGORY_COLOR_MAP[event.category]}`}>
                    {event.category}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}

        <Button variant="ghost" className="mt-4 w-full">
          View All Activity
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
