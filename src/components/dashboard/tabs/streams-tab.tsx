'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';

import { useRouter } from 'next/navigation';

import { PiggyBank, Plus, UserPlus, Wallet } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { useDashboard } from '../dashboard-context';
import { EmptyState } from '../empty-state';
import { StreamDetailDrawer } from '../streams/stream-detail-drawer';
import { StreamsList } from '../streams/streams-list';

type StreamFilterStatus = 'all' | 'active' | 'inactive' | 'closed' | 'draft' | 'needs-attention';

interface StreamsTabProps {
  filterState?: string;
}

const mapStatusToPath: Record<StreamFilterStatus, string> = {
  all: '/dashboard/streams',
  active: '/dashboard/streams/active',
  inactive: '/dashboard/streams/suspended',
  closed: '/dashboard/streams/closed',
  draft: '/dashboard/streams/drafts',
  'needs-attention': '/dashboard/streams/needs-attention',
};

const mapStatusToPageKey: Record<StreamFilterStatus, string> = {
  all: 'all-streams',
  active: 'active',
  inactive: 'suspended',
  closed: 'closed',
  draft: 'drafts',
  'needs-attention': 'needs-attention',
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

export function StreamsTab({ filterState }: StreamsTabProps) {
  const {
    selectedStreamId,
    setSelectedStreamId,
    setIsCreateStreamModalOpen,
    setIsAddEmployeeModalOpen,
    setIsTopUpAccountModalOpen,
    setupProgress,
  } = useDashboard();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimisticPageKey, setOptimisticPageKey] = useState(filterState);

  useEffect(() => {
    setOptimisticPageKey(filterState);
  }, [filterState]);

  const filterStatus = useMemo<StreamFilterStatus>(
    () => deriveStatusFromPageKey(optimisticPageKey),
    [optimisticPageKey],
  );

  useEffect(() => {
    setSelectedStreamId(null);
  }, [filterStatus, setSelectedStreamId]);

  const handleFilterChange = (status: StreamFilterStatus) => {
    const nextPageKey = mapStatusToPageKey[status];
    setOptimisticPageKey(nextPageKey);

    startTransition(() => {
      router.push(mapStatusToPath[status]);
    });
  };

  return (
    <div className="space-y-6" aria-busy={isPending}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Streams</h1>
          <p className="text-muted-foreground">Manage your payment streams</p>
        </div>
        <Button
          onClick={() => setIsCreateStreamModalOpen(true)}
          className="gap-2"
          disabled={!setupProgress.employeeAdded || !setupProgress.tokenAccountFunded}
        >
          <Plus className="h-4 w-4" />
          New Stream
        </Button>
      </div>

      {!setupProgress.walletConnected ? (
        <EmptyState
          icon={<Wallet className="h-12 w-12 text-muted-foreground" />}
          title="Connect your treasury wallet"
          description="Link the employer wallet to view, fund, or create payment streams."
        />
      ) : !setupProgress.tokenAccountFunded ? (
        <EmptyState
          icon={<PiggyBank className="h-12 w-12 text-muted-foreground" />}
          title="Fund your primary token account"
          description="Top up the default token account before creating a payment stream."
          action={{
            label: 'Top Up Account',
            onClick: () => setIsTopUpAccountModalOpen(true),
          }}
        />
      ) : !setupProgress.employeeAdded ? (
        <EmptyState
          icon={<UserPlus className="h-12 w-12 text-muted-foreground" />}
          title="Add an employee to get started"
          description="Invite or create an employee profile, then assign a payment stream."
          action={{
            label: 'Add Employee',
            onClick: () => setIsAddEmployeeModalOpen(true),
          }}
        />
      ) : !setupProgress.streamCreated ? (
        <EmptyState
          icon={<Plus className="h-12 w-12 text-muted-foreground" />}
          title="Create your first stream"
          description="Launch a live payment stream once your account is funded and an employee is ready."
          action={{
            label: 'Create Stream',
            onClick: () => setIsCreateStreamModalOpen(true),
          }}
        />
      ) : (
        <>
          <StreamsList
            filterStatus={filterStatus}
            onFilterChange={handleFilterChange}
            onSelectStream={setSelectedStreamId}
            selectedStreamId={selectedStreamId}
          />

          {selectedStreamId && (
            <StreamDetailDrawer
              streamId={selectedStreamId}
              onClose={() => setSelectedStreamId(null)}
              isOpen={!!selectedStreamId}
            />
          )}
        </>
      )}
    </div>
  );
}
