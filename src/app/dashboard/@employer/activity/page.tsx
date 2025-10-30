import { getActivityLog } from '@/app/dashboard/actions/activity-log';
import { ActivityLogTab, type ActivityEvent } from '@/components/dashboard/tabs/activity-log-tab';

const STREAM_CATEGORY_MAP: Record<string, ActivityEvent['type']> = {
  stream_created: 'stream',
  stream_top_up: 'funding',
  stream_withdrawn: 'funding',
  stream_refresh_activity: 'stream',
  stream_emergency_withdraw: 'funding',
  stream_closed: 'stream',
  stream_reactivated: 'stream',
};

function toActivityEvent(entry: Awaited<ReturnType<typeof getActivityLog>>[number]): ActivityEvent {
  const category =
    entry.activityType && entry.activityType in STREAM_CATEGORY_MAP
      ? STREAM_CATEGORY_MAP[entry.activityType]
      : 'system';
  const actor = entry.actorAddress ?? entry.actorType ?? 'system';

  return {
    id: entry.id,
    timestamp: entry.occurredAt,
    type: category,
    title: entry.title,
    description: entry.description,
    actor,
    status: 'success',
    metadata: entry.metadata,
  };
}

export default async function DashboardActivityPage() {
  const activityEntries = await getActivityLog({ limit: 100 });
  const activity: ActivityEvent[] = activityEntries.map(toActivityEvent);

  return <ActivityLogTab activity={activity} />;
}
