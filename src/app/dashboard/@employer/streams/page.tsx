import { DashboardFeatureFlagDisabled } from '@/components/dashboard/feature-flag-disabled';
import { employerDashboardStreamsViewFlag } from '@/core/config/flags';
import { StreamsTab } from '@/features/streams/components/streams-tab';
import { getStreamsForDashboard } from '@/features/streams/server/queries/streams';

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
