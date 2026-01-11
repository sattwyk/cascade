'use client';

import { useEffect } from 'react';

import { DollarSign, Loader2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useEmployeeStreamsQuery } from '@/features/streams/data-access/use-employee-streams-query';
import { ellipsify } from '@/lib/utils';

interface ViewStreamsModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeName: string;
  employeeId: string | null;
}

function formatDateLabel(isoDate?: string | null) {
  if (!isoDate) return '—';
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatTokenAmount(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return '—';
  return value.toLocaleString(undefined, {
    maximumFractionDigits: 6,
  });
}

export function ViewStreamsModal({ isOpen, onClose, employeeName, employeeId }: ViewStreamsModalProps) {
  const {
    data: streams,
    isLoading,
    isError,
    error,
    refetch,
  } = useEmployeeStreamsQuery({ employeeId, enabled: isOpen });

  useEffect(() => {
    if (isOpen && employeeId) {
      void refetch();
    }
  }, [employeeId, isOpen, refetch]);

  const streamItems = streams ?? [];
  const hasStreams = streamItems.length > 0;
  const errorMessage = isError ? (error instanceof Error ? error.message : 'Unable to load streams.') : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Streams for {employeeName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!employeeId ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">Select an employee to view their streams.</p>
            </div>
          ) : isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label="Loading streams" />
            </div>
          ) : errorMessage ? (
            <div className="py-8 text-center">
              <p className="text-sm text-destructive">{errorMessage}</p>
            </div>
          ) : !hasStreams ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">No active streams for this employee</p>
            </div>
          ) : (
            <div className="space-y-3">
              {streamItems.map((stream) => (
                <Card key={stream.id}>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <h3 className="font-semibold">{ellipsify(stream.streamAddress, 6)}</h3>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Started {formatDateLabel(stream.createdAt)}
                            {stream.closedAt ? ` • Closed ${formatDateLabel(stream.closedAt)}` : ''}
                          </p>
                        </div>
                        <Badge variant={stream.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                          {stream.status}
                        </Badge>
                      </div>

                      <div className="grid gap-4 text-sm sm:grid-cols-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Hourly Rate</p>
                          <div className="mt-1 flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            <span className="font-medium">{formatTokenAmount(stream.hourlyRate)}/hr</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Total Deposited</p>
                          <p className="mt-1 font-medium">{formatTokenAmount(stream.totalDeposited)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Withdrawn</p>
                          <p className="mt-1 font-medium">{formatTokenAmount(stream.withdrawnAmount)}</p>
                        </div>
                      </div>

                      <div className="grid gap-4 text-xs text-muted-foreground sm:grid-cols-2">
                        <div>
                          <p className="font-medium text-foreground">Mint</p>
                          <p className="mt-1 font-mono">{ellipsify(stream.mintAddress, 6)}</p>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">Vault</p>
                          <p className="mt-1 font-mono">{ellipsify(stream.vaultAddress, 6)}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="flex gap-3 border-t border-border pt-6">
            <Button onClick={onClose} className="flex-1">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
