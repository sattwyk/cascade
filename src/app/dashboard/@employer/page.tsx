import { getActivityLog } from '@/app/dashboard/actions/activity-log';
import { getStreamsForDashboard } from '@/app/dashboard/data/streams';
import { OverviewTab } from '@/components/dashboard/tabs/overview-tab';

export default async function DashboardOverviewPage() {
  const [streams, activity] = await Promise.all([getStreamsForDashboard(), getActivityLog({ limit: 10 })]);

  return <OverviewTab initialStreams={streams} initialActivity={activity} />;
}
