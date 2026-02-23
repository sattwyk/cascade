import { DashboardFeatureFlagDisabled } from '@/components/dashboard/feature-flag-disabled';
import { employerDashboardActivityViewFlag } from '@/core/config/flags';
import { ActivityLogTab, type ActivityEvent } from '@/features/organization/components/activity-log-tab';
import { getActivityLog } from '@/features/organization/server/actions/activity-log';

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

  // Extract status from metadata, default to 'success'
  const status =
    entry.metadata && typeof entry.metadata === 'object' && 'status' in entry.metadata
      ? (entry.metadata.status as ActivityEvent['status'])
      : 'success';

  return {
    id: entry.id,
    timestamp: entry.occurredAt,
    type: category,
    title: entry.title,
    description: entry.description,
    actor,
    status,
    metadata: entry.metadata,
  };
}

export default async function DashboardActivityPage() {
  if (!(await employerDashboardActivityViewFlag())) {
    return (
      <DashboardFeatureFlagDisabled
        title="Activity"
        description="Enable `dashboard_employer_activity_view` to access this employer dashboard page."
      />
    );
  }

  const activityEntries = await getActivityLog({ limit: 100 });
  const activity: ActivityEvent[] = activityEntries.map(toActivityEvent);

  return <ActivityLogTab activity={activity} />;
}
