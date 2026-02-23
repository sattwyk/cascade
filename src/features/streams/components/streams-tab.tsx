'use client';

import { useEffect, useMemo, useTransition } from 'react';

import { useRouter } from 'next/navigation';

import { useWalletUi } from '@wallet-ui/react';
import type { Address } from 'gill';
import { PiggyBank, Plus, UserPlus, Wallet } from 'lucide-react';

import { hasPositiveTokenBalance, NULL_ADDRESS } from '@/core/solana/token-helpers';
import { Button } from '@/core/ui/button';
import { EmptyState } from '@/core/ui/empty-state';
import { useGetTokenAccountsQuery } from '@/features/account/client/queries/use-get-token-accounts-query';
import { useDashboardEmployeesQuery } from '@/features/employees/client/queries/use-dashboard-employees-query';
import { useDashboard } from '@/features/organization/components/layout/employer-dashboard-context';
import { useDashboardStreamsQuery } from '@/features/streams/client/queries/use-dashboard-streams-query';
import type { DashboardStream } from '@/types/stream';

import { StreamDetailDrawer } from './stream-detail-drawer';
import { StreamsList } from './streams-list';

type StreamFilterStatus = 'all' | 'active' | 'inactive' | 'closed' | 'draft' | 'needs-attention';

interface StreamsTabProps {
  filterState?: string;
  streams: DashboardStream[];
}

const mapStatusToPath: Record<StreamFilterStatus, string> = {
  all: '/dashboard/streams',
  active: '/dashboard/streams/active',
  inactive: '/dashboard/streams/suspended',
  closed: '/dashboard/streams/closed',
  draft: '/dashboard/streams/drafts',
  'needs-attention': '/dashboard/streams/needs-attention',
};

function deriveStatusFromPageKey(pageKey?: string): StreamFilterStatus {
  switch (pageKey) {
    case 'active':
      return 'active';
    case 'suspended':
      return 'inactive';
    case 'closed':
      return 'closed';
    case 'drafts':
      return 'draft';
    case 'needs-attention':
      return 'needs-attention';
    default:
      return 'all';
  }
}

export function StreamsTab({ filterState, streams }: StreamsTabProps) {
  const {
    selectedStreamId,
    setSelectedStreamId,
    openCreateStreamModal,
    openAddEmployeeModal,
    openTopUpAccountModal,
    setupProgress,
  } = useDashboard();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { data: streamData = [], isFetching } = useDashboardStreamsQuery({ initialData: streams });
  const { data: employees = [] } = useDashboardEmployeesQuery();
  const { account } = useWalletUi();
  const walletAddress = (account?.address as Address) ?? NULL_ADDRESS;
  const tokenAccountsQuery = useGetTokenAccountsQuery({ address: walletAddress, enabled: Boolean(account?.address) });
  const hasStreams = streamData.length > 0;
  const hasEmployees = employees.length > 0;
  const walletConnected = setupProgress.walletConnected || Boolean(account?.address);
  const tokenFundingComplete = useMemo(
    () => setupProgress.tokenAccountFunded || hasPositiveTokenBalance(tokenAccountsQuery.data),
    [setupProgress.tokenAccountFunded, tokenAccountsQuery.data],
  );
  const employeeStepComplete = setupProgress.employeeAdded || hasEmployees;

  const filterStatus = useMemo<StreamFilterStatus>(() => deriveStatusFromPageKey(filterState), [filterState]);

  const selectedStream = useMemo(
    () => streamData.find((stream) => stream.id === selectedStreamId) ?? null,
    [streamData, selectedStreamId],
  );

  useEffect(() => {
    if (!selectedStreamId) return;
    if (!selectedStream) {
      setSelectedStreamId(null);
    }
  }, [selectedStream, selectedStreamId, setSelectedStreamId]);

  const handleFilterChange = (status: StreamFilterStatus) => {
    setSelectedStreamId(null);

    startTransition(() => {
      router.push(mapStatusToPath[status]);
    });
  };

  return (
    <div className="space-y-6" aria-busy={isPending || isFetching}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Streams</h1>
          <p className="text-muted-foreground">Manage your payment streams</p>
        </div>
        <Button
          onClick={() => openCreateStreamModal()}
          className="gap-2"
          disabled={!employeeStepComplete || !tokenFundingComplete}
        >
          <Plus className="h-4 w-4" />
          New Stream
        </Button>
      </div>

      {!walletConnected ? (
        <EmptyState
          icon={<Wallet className="h-12 w-12 text-muted-foreground" />}
          title="Connect your treasury wallet"
          description="Link the employer wallet to view, fund, or create payment streams."
        />
      ) : !tokenFundingComplete ? (
        <EmptyState
          icon={<PiggyBank className="h-12 w-12 text-muted-foreground" />}
          title="Fund your primary token account"
          description="Top up the default token account before creating a payment stream."
          action={{
            label: 'Top Up Account',
            onClick: openTopUpAccountModal,
          }}
        />
      ) : !employeeStepComplete ? (
        <EmptyState
          icon={<UserPlus className="h-12 w-12 text-muted-foreground" />}
          title="Add an employee to get started"
          description="Invite or create an employee profile, then assign a payment stream."
          action={{
            label: 'Add Employee',
            onClick: openAddEmployeeModal,
          }}
        />
      ) : !hasStreams ? (
        <EmptyState
          icon={<Plus className="h-12 w-12 text-muted-foreground" />}
          title="Create your first stream"
          description="Launch a live payment stream once your account is funded and an employee is ready."
          action={{
            label: 'Create Stream',
            onClick: () => openCreateStreamModal(),
          }}
        />
      ) : (
        <>
          <StreamsList
            filterStatus={filterStatus}
            onFilterChange={handleFilterChange}
            onSelectStream={setSelectedStreamId}
            selectedStreamId={selectedStreamId}
            streams={streamData}
          />

          {selectedStream && (
            <StreamDetailDrawer
              stream={selectedStream}
              onClose={() => setSelectedStreamId(null)}
              isOpen={!!selectedStream}
            />
          )}
        </>
      )}
    </div>
  );
}
