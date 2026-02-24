'use client';

import { Copy, Download, X } from 'lucide-react';
import { toast } from 'sonner';

import { AppExplorerLink } from '@/components/app-explorer-link';
import { useIsMobile } from '@/core/hooks/use-mobile';
import { Badge } from '@/core/ui/badge';
import { Button } from '@/core/ui/button';
import { Drawer, DrawerContent, DrawerTitle } from '@/core/ui/drawer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/core/ui/tabs';
import type { DashboardStream } from '@/types/stream';

import { StreamActionButtons } from './stream-action-buttons';
import { StreamActivityHistory } from './stream-activity-history';

interface StreamDetailDrawerProps {
  stream: DashboardStream;
  onClose: () => void;
  isOpen: boolean;
}

export function StreamDetailDrawer({ stream, onClose, isOpen }: StreamDetailDrawerProps) {
  const isMobile = useIsMobile();

  const USD_FORMATTER = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });

  const runwayDays = (() => {
    if (!stream.hourlyRate) return 0;
    const days = stream.availableToWithdraw / (stream.hourlyRate * 24);
    return Number.isFinite(days) ? Math.max(Math.floor(days), 0) : 0;
  })();

  const runwayPercentage = Math.min(runwayDays / 30, 1) * 100;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard', {
      description: `${label} address has been copied.`,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-700';
      case 'suspended':
        return 'bg-red-500/10 text-red-700';
      case 'closed':
        return 'bg-gray-500/10 text-gray-700';
      default:
        return 'bg-gray-500/10 text-gray-700';
    }
  };

  return (
    <Drawer
      direction={isMobile ? undefined : 'right'}
      dismissible={false}
      modal={true}
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
    >
      <DrawerContent
        className={`max-h-full ${isMobile ? '' : 'fixed top-0 right-0 bottom-0 w-96 rounded-none border-l'}`}
        style={!isMobile ? { left: 'auto', right: 0, top: 0, bottom: 0, borderRadius: 0 } : {}}
      >
        <div className="absolute top-4 right-4 z-10">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className={`overflow-y-auto ${isMobile ? 'px-4 pt-12 pb-6' : 'px-6 pt-12 pb-6'}`}>
          <div className="space-y-4">
            {/* Header */}
            <div>
              <DrawerTitle className="text-lg font-bold">{stream.employeeName}</DrawerTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                {stream.employeeWallet ?? 'No employee wallet on file'}
              </p>
            </div>

            {/* Status badge */}
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(stream.status)} variant="secondary">
                {stream.status}
              </Badge>
              <span className="text-xs text-muted-foreground">{stream.cluster}</span>
            </div>

            {/* Balance section - Compact grid */}
            <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/50 p-3">
              <div>
                <p className="text-xs text-muted-foreground">Vault Balance</p>
                <p className="text-lg font-bold">{USD_FORMATTER.format(stream.vaultBalance)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Deposited</p>
                <p className="text-lg font-bold">{USD_FORMATTER.format(stream.totalDeposited)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Available</p>
                <p className="text-lg font-bold">{USD_FORMATTER.format(stream.availableToWithdraw)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Hourly Rate</p>
                <p className="text-lg font-bold">{USD_FORMATTER.format(stream.hourlyRate)}</p>
              </div>
            </div>

            {/* Runway meter */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium">Runway</p>
                <p className="text-sm font-semibold">{runwayDays} days</p>
              </div>
              <div className="h-2 w-full rounded-full bg-muted">
                <div className="h-2 rounded-full bg-green-500" style={{ width: `${runwayPercentage || 0}%` }} />
              </div>
            </div>

            {/* Activity history */}
            <Tabs defaultValue="activity" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
              </TabsList>

              <TabsContent value="activity" className="mt-3 space-y-3">
                <StreamActivityHistory streamId={stream.id} />
              </TabsContent>

              <TabsContent value="details" className="mt-3 space-y-3">
                <div className="space-y-2">
                  <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Stream Addresses
                  </p>
                  <div className="space-y-2">
                    <div>
                      <p className="mb-1 text-xs text-muted-foreground">Stream PDA</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 truncate rounded bg-muted p-2 font-mono text-xs">
                          {stream.streamAddress}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => copyToClipboard(stream.streamAddress, 'stream')}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <p className="mb-1 text-xs text-muted-foreground">Vault PDA</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 truncate rounded bg-muted p-2 font-mono text-xs">
                          {stream.vaultAddress}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => copyToClipboard(stream.vaultAddress, 'vault')}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <p className="mb-1 text-xs text-muted-foreground">Mint</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 truncate rounded bg-muted p-2 font-mono text-xs">
                          {stream.mintAddress}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => copyToClipboard(stream.mintAddress, 'mint')}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="pt-1 text-xs text-muted-foreground">{stream.mintLabel}</p>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" className="flex-1 gap-2 bg-transparent" asChild>
                        <AppExplorerLink
                          address={stream.streamAddress}
                          label="Explorer"
                          className="inline-flex items-center justify-center gap-2"
                        />
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1 gap-2 bg-transparent">
                        <Download className="h-4 w-4" />
                        Export
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Action buttons */}
            <StreamActionButtons streamId={stream.id} status={stream.status} />
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
