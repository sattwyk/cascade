import { employerDashboardStreamsViewFlag } from '@/core/config/flags';
import { DashboardFeatureFlagDisabled } from '@/core/ui/feature-flag-disabled';
import { StreamsTab } from '@/features/streams/components/employer-streams-tab';
import { getStreamsForDashboard } from '@/features/streams/server/queries/employer-list-streams';

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
