'use client';

import { useState } from 'react';

import { Download, Search } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getAccountStateConfig } from '@/lib/config/account-states';

import { useDashboard } from '../dashboard-context';
import { EmptyState } from '../empty-state';

interface AuditEntry {
  id: string;
  timestamp: string;
  entity: string;
  entityId: string;
  action: 'create' | 'update' | 'delete' | 'suspend' | 'reactivate';
  changes: Record<string, { before: string; after: string }>;
  actor: string;
  ipAddress: string;
}

const MOCK_AUDIT: AuditEntry[] = [
  {
    id: '1',
    timestamp: '2024-10-23T14:32:00Z',
    entity: 'Stream',
    entityId: 'stream_001',
    action: 'create',
    changes: {
      hourlyRate: { before: '-', after: '$25.00' },
      employee: { before: '-', after: 'John Doe' },
    },
    actor: 'admin@cascade.com',
    ipAddress: '192.168.1.1',
  },
  {
    id: '2',
    timestamp: '2024-10-23T13:15:00Z',
    entity: 'Employee',
    entityId: 'emp_001',
    action: 'update',
    changes: {
      status: { before: 'draft', after: 'ready' },
      walletAddress: { before: '-', after: '0x742d...8f2a' },
    },
    actor: 'admin@cascade.com',
    ipAddress: '192.168.1.1',
  },
  {
    id: '3',
    timestamp: '2024-10-22T16:45:00Z',
    entity: 'Stream',
    entityId: 'stream_002',
    action: 'suspend',
    changes: {
      status: { before: 'active', after: 'suspended' },
      reason: { before: '-', after: 'Insufficient funds' },
    },
    actor: 'system',
    ipAddress: '0.0.0.0',
  },
];

const actionColors = {
  create: 'bg-green-100 text-green-800',
  update: 'bg-blue-100 text-blue-800',
  delete: 'bg-red-100 text-red-800',
  suspend: 'bg-yellow-100 text-yellow-800',
  reactivate: 'bg-purple-100 text-purple-800',
};

export function AuditTrailTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const { accountState, setupProgress, setIsCreateStreamModalOpen } = useDashboard();
  const config = getAccountStateConfig(accountState);

  const filteredAudit = MOCK_AUDIT.filter((entry) => {
    const matchesSearch =
      entry.entity.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.entityId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.actor.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  if (!config.showAuditTrailTab) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Audit Trail</h1>
          <p className="text-muted-foreground">Complete record of all system changes and modifications</p>
        </div>
        <EmptyState
          icon={<Search className="h-12 w-12 text-muted-foreground" />}
          title="Audit Trail Coming Soon"
          description="Complete your wallet setup to start tracking system changes"
        />
      </div>
    );
  }

  if (!setupProgress.streamCreated) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Audit Trail</h1>
          <p className="text-muted-foreground">Complete record of all system changes and modifications</p>
        </div>
        <EmptyState
          icon={<Search className="h-12 w-12 text-muted-foreground" />}
          title="No changes recorded yet"
          description="We’ll start capturing a full audit trail as soon as payroll activity begins."
          action={{
            label: 'Create Stream',
            onClick: () => setIsCreateStreamModalOpen(true),
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Audit Trail</h1>
          <p className="text-muted-foreground">Complete record of all system changes and modifications</p>
        </div>
        <Button variant="outline" className="gap-2 bg-transparent">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute top-3 left-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by entity, ID, or actor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Audit entries */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Entries</CardTitle>
          <CardDescription>{filteredAudit.length} changes recorded</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {filteredAudit.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">No audit entries found</p>
            ) : (
              filteredAudit.map((entry) => (
                <div key={entry.id} className="border-b pb-6 last:border-0">
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <div className="mb-2 flex items-center gap-2">
                        <Badge className={actionColors[entry.action]}>{entry.action}</Badge>
                        <span className="font-semibold">
                          {entry.entity} ({entry.entityId})
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        By {entry.actor} • {new Date(entry.timestamp).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">IP: {entry.ipAddress}</p>
                    </div>
                  </div>
                  <div className="space-y-2 rounded-md bg-muted p-3">
                    {Object.entries(entry.changes).map(([field, change]) => (
                      <div key={field} className="text-sm">
                        <span className="font-medium">{field}:</span>
                        <span className="text-muted-foreground"> {change.before}</span>
                        <span className="mx-2">→</span>
                        <span className="font-medium text-foreground">{change.after}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
