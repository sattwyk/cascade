import { getStreamsForDashboard } from '@/app/dashboard/data/streams';
import { StreamsTab } from '@/components/dashboard/tabs/streams-tab';

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
  const { filter } = await params;
  const rawFilter = filter?.toLowerCase();
  const resolvedFilter = STREAM_FILTER_MAP[rawFilter] ?? 'all-streams';
  const streams = await getStreamsForDashboard();

  return <StreamsTab filterState={resolvedFilter} streams={streams} />;
}
