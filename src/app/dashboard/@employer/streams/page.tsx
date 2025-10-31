import { getStreamsForDashboard } from '@/app/dashboard/data/streams';
import { StreamsTab } from '@/components/dashboard/tabs/streams-tab';

export default async function DashboardStreamsPage() {
  const streams = await getStreamsForDashboard();
  return <StreamsTab filterState="all-streams" streams={streams} />;
}
