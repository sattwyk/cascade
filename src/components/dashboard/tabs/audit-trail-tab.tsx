'use client';

import { useEffect, useState } from 'react';

import { Download, Search } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getAuditTrail, type AuditTrailEntry } from '@/features/dashboard/actions/get-audit-trail';
import { getAccountStateConfig } from '@/lib/config/account-states';

import { useDashboard } from '../dashboard-context';
import { EmptyState } from '../empty-state';

const categoryColors: Record<AuditTrailEntry['category'], string> = {
  employee: 'bg-blue-100 text-blue-800',
  stream: 'bg-green-100 text-green-800',
  organization: 'bg-purple-100 text-purple-800',
  system: 'bg-gray-100 text-gray-800',
};

interface AuditTrailTabProps {
  organizationId: string;
  initialEntries?: AuditTrailEntry[];
}

export function AuditTrailTab({ organizationId, initialEntries = [] }: AuditTrailTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [auditEntries, setAuditEntries] = useState<AuditTrailEntry[]>(initialEntries);
  const [loading, setLoading] = useState(false);
  const { accountState, setupProgress, setIsCreateStreamModalOpen } = useDashboard();
  const config = getAccountStateConfig(accountState);

  useEffect(() => {
    async function fetchAuditTrail() {
      if (!organizationId) return;

      try {
        setLoading(true);
        const result = await getAuditTrail(organizationId, { limit: 100 });
        setAuditEntries(result.entries);
      } catch (error) {
        console.error('Failed to fetch audit trail:', error);
      } finally {
        setLoading(false);
      }
    }

    if (config.showAuditTrailTab && setupProgress.streamCreated && initialEntries.length === 0) {
      fetchAuditTrail();
    }
  }, [organizationId, config.showAuditTrailTab, setupProgress.streamCreated, initialEntries.length]);

  const filteredAudit = auditEntries.filter((entry) => {
    const matchesSearch =
      entry.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.performedBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.category.toLowerCase().includes(searchQuery.toLowerCase());
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
          <CardDescription>{loading ? 'Loading...' : `${filteredAudit.length} changes recorded`}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {loading ? (
              <p className="py-8 text-center text-muted-foreground">Loading audit trail...</p>
            ) : filteredAudit.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">No audit entries found</p>
            ) : (
              filteredAudit.map((entry) => (
                <div key={entry.id} className="border-b pb-6 last:border-0">
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <Badge className={categoryColors[entry.category]}>{entry.category}</Badge>
                        <span className="text-sm font-medium">{entry.action}</span>
                      </div>
                      <p className="mb-2 text-sm text-muted-foreground">{entry.details}</p>
                      <p className="text-xs text-muted-foreground">
                        By {entry.performedBy} • {new Date(entry.timestamp).toLocaleString()}
                      </p>
                      {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                            View metadata
                          </summary>
                          <div className="mt-2 space-y-1 rounded-md bg-muted p-3">
                            {Object.entries(entry.metadata).map(([key, value]) => (
                              <div key={key} className="text-xs">
                                <span className="font-medium">{key}:</span>
                                <span className="ml-2 text-muted-foreground">
                                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
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
