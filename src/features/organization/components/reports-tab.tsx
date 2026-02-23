'use client';

import { Plus } from 'lucide-react';

import { useDashboard } from '@/components/dashboard/dashboard-context';
import { EmptyState } from '@/components/dashboard/empty-state';
import { getAccountStateConfig } from '@/core/config/account-states';

export function ReportsTab() {
  const { accountState } = useDashboard();
  const config = getAccountStateConfig(accountState);

  if (!config.showReportsTab) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground">Generate and manage organization reports</p>
        </div>
        <EmptyState
          icon={<Plus className="h-12 w-12 text-muted-foreground" />}
          title="Reports Coming Soon"
          description="Create multiple payment streams to unlock advanced reporting features"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground">Generate and manage organization reports</p>
        </div>
      </div>

      <EmptyState
        icon={<Plus className="h-12 w-12 text-muted-foreground" />}
        title="No reports yet"
        description="Reports will be generated as you create and manage payment streams"
      />
    </div>
  );
}
