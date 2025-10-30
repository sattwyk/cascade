'use client';

import { useMemo, useState } from 'react';

import { formatDistanceToNow } from 'date-fns';
import { Filter, Plus, Search } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import type { DashboardStream } from '@/types/stream';

import { EmptyState } from '../empty-state';

type StreamStatus = DashboardStream['status'];

interface StreamsListProps {
  filterStatus: 'all' | 'active' | 'inactive' | 'closed' | 'draft' | 'needs-attention';
  onFilterChange: (status: 'all' | 'active' | 'inactive' | 'closed' | 'draft' | 'needs-attention') => void;
  onSelectStream: (streamId: string) => void;
  selectedStreamId: string | null;
  streams: ReadonlyArray<DashboardStream>;
}

const CURRENCY_FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatLastActivity(lastActivityAt: string | null) {
  if (!lastActivityAt) return 'No activity recorded';
  const parsed = new Date(lastActivityAt);
  if (Number.isNaN(parsed.getTime())) return 'No activity recorded';
  return `Updated ${formatDistanceToNow(parsed, { addSuffix: true })}`;
}

function matchesStatus(
  streamStatus: StreamStatus,
  filterStatus: StreamsListProps['filterStatus'],
  stream: StreamsListProps['streams'][number],
) {
  switch (filterStatus) {
    case 'active':
      return streamStatus === 'active';
    case 'inactive':
      return streamStatus === 'suspended';
    case 'closed':
      return streamStatus === 'closed';
    case 'draft':
      return streamStatus === 'draft';
    case 'needs-attention':
      return streamStatus === 'suspended' || stream.availableToWithdraw <= 0;
    case 'all':
    default:
      return true;
  }
}

export function StreamsList({
  filterStatus,
  onFilterChange,
  onSelectStream,
  selectedStreamId,
  streams,
}: StreamsListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredStreams = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return streams.filter((stream) => {
      if (!matchesStatus(stream.status, filterStatus, stream)) return false;

      if (!query) return true;

      const haystacks = [stream.employeeName, stream.employeeWallet ?? '', stream.mintLabel].join(' ').toLowerCase();

      return haystacks.includes(query);
    });
  }, [filterStatus, searchQuery, streams]);

  const getStatusColor = (status: StreamStatus) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-700';
      case 'suspended':
        return 'bg-red-500/10 text-red-700';
      case 'closed':
        return 'bg-gray-500/10 text-gray-700';
      case 'draft':
        return 'bg-yellow-500/10 text-yellow-700';
      default:
        return 'bg-gray-500/10 text-gray-700';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <CardTitle>Payment Streams</CardTitle>
          <div className="flex gap-2">
            <div className="relative flex-1 md:flex-none">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onFilterChange('all')}>
                  All Streams {filterStatus === 'all' && '✓'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onFilterChange('active')}>
                  Active {filterStatus === 'active' && '✓'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onFilterChange('inactive')}>
                  Inactive {filterStatus === 'inactive' && '✓'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onFilterChange('closed')}>
                  Closed {filterStatus === 'closed' && '✓'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onFilterChange('draft')}>
                  Draft {filterStatus === 'draft' && '✓'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onFilterChange('needs-attention')}>
                  Needs Attention {filterStatus === 'needs-attention' && '✓'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredStreams.length === 0 ? (
          <EmptyState
            icon={<Plus className="h-12 w-12 text-muted-foreground" />}
            title="No streams found"
            description={
              filterStatus === 'all'
                ? 'Create your first payment stream to get started'
                : `No ${filterStatus} streams at the moment`
            }
            action={
              filterStatus === 'all'
                ? {
                    label: 'Create Stream',
                    onClick: () => console.log('Create stream'),
                  }
                : undefined
            }
          />
        ) : (
          <div className="space-y-2">
            {filteredStreams.map((stream) => (
              <button
                key={stream.id}
                onClick={() => onSelectStream(stream.id)}
                className={`w-full rounded-lg border p-4 text-left transition-colors ${
                  selectedStreamId === stream.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <h3 className="truncate font-semibold">{stream.employeeName}</h3>
                      <Badge className={getStatusColor(stream.status)} variant="secondary">
                        {stream.status}
                      </Badge>
                    </div>
                    <p className="mb-3 text-sm text-muted-foreground">
                      {stream.employeeWallet ? stream.employeeWallet : 'No wallet on file'}
                    </p>
                    <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Hourly Rate</p>
                        <p className="font-semibold">{CURRENCY_FORMATTER.format(stream.hourlyRate)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Vault Balance</p>
                        <p className="font-semibold">{CURRENCY_FORMATTER.format(stream.vaultBalance)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Available</p>
                        <p className="font-semibold">{CURRENCY_FORMATTER.format(stream.availableToWithdraw)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Last Activity</p>
                        <p className="text-xs font-semibold">
                          {formatLastActivity(stream.lastActivityAt ?? stream.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">{stream.mintLabel}</Badge>
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
