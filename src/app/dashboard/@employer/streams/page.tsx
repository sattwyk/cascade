import { getStreamsForDashboard } from '@/app/dashboard/data/streams';
import { DashboardFeatureFlagDisabled } from '@/components/dashboard/feature-flag-disabled';
import { StreamsTab } from '@/components/dashboard/tabs/streams-tab';
import { employerDashboardStreamsViewFlag } from '@/flags';

export default async function DashboardStreamsPage() {
  if (!(await employerDashboardStreamsViewFlag())) {
    return (
      <DashboardFeatureFlagDisabled
        title="Streams"
        description="Enable `dashboard_employer_streams_view` to access this employer dashboard page."
      />
    );
  }

  const streams = await getStreamsForDashboard();
  return <StreamsTab filterState="all-streams" streams={streams} />;
}
