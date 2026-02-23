import { DashboardFeatureFlagDisabled } from '@/components/dashboard/feature-flag-disabled';
import { employerDashboardStreamsViewFlag } from '@/core/config/flags';
import { StreamsTab } from '@/features/streams/components/streams-tab';
import { getStreamsForDashboard } from '@/features/streams/server/queries/streams';

const STREAM_FILTER_MAP: Record<string, string> = {
  all: 'all-streams',
  'all-streams': 'all-streams',
  active: 'active',
  inactive: 'suspended',
  suspended: 'suspended',
  closed: 'closed',
  draft: 'drafts',
  drafts: 'drafts',
  'needs-attention': 'needs-attention',
};

export default async function DashboardStreamsFilterPage({ params }: { params: Promise<{ filter: string }> }) {
  if (!(await employerDashboardStreamsViewFlag())) {
    return (
      <DashboardFeatureFlagDisabled
        title="Streams"
        description="Enable `dashboard_employer_streams_view` to access this employer dashboard page."
      />
    );
  }

  const { filter } = await params;
  const rawFilter = filter?.toLowerCase();
  const resolvedFilter = STREAM_FILTER_MAP[rawFilter] ?? 'all-streams';
  const streams = await getStreamsForDashboard();

  return <StreamsTab filterState={resolvedFilter} streams={streams} />;
}
