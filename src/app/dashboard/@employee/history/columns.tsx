'use client';

import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { getExplorerLink, type SolanaClusterMoniker } from 'gill';
import { ArrowUpDown, ExternalLink, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/core/ui/badge';
import { Button } from '@/core/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/core/ui/dropdown-menu';

export type Payment = {
  id: string;
  amount: number;
  employer: string | null;
  timestamp: Date | null;
  txSignature: string | null;
  status: 'completed' | 'failed';
};

export function getEmployeeHistoryColumns(clusterMoniker: SolanaClusterMoniker): ColumnDef<Payment>[] {
  return [
    {
      accessorKey: 'timestamp',
      header: ({ column }) => {
        return (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
            Date & Time
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const date = row.getValue('timestamp') as Date | null;
        if (!date) {
          return <span className="text-sm text-muted-foreground">Unknown</span>;
        }
        return (
          <div className="flex flex-col">
            <span className="font-medium">{format(date, 'MMM dd, yyyy')}</span>
            <span className="text-xs text-muted-foreground">{format(date, 'h:mm a')}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'txSignature',
      header: 'Transaction',
      cell: ({ row }) => {
        const signature = (row.getValue('txSignature') as string) ?? '';
        if (!signature) {
          return <span className="text-sm text-muted-foreground">No signature</span>;
        }
        const txLink = getExplorerLink({ transaction: signature, cluster: clusterMoniker });
        return (
          <div className="flex items-center gap-2">
            <code className="rounded bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">
              {signature.slice(0, 8)}...{signature.slice(-8)}
            </code>
            <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
              <a href={txLink} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        return (
          <Badge
            variant="outline"
            className={
              status === 'completed'
                ? 'border-green-200 bg-green-500/10 text-green-700'
                : 'border-red-200 bg-red-500/10 text-red-700'
            }
          >
            {status}
          </Badge>
        );
      },
      filterFn: (row, id, value) => {
        if (!value) return true;
        return String(row.getValue(id)).toLowerCase().includes(String(value).toLowerCase());
      },
    },
    {
      accessorKey: 'amount',
      header: ({ column }) => {
        return (
          <div className="text-right">
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
              Amount
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        );
      },
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue('amount'));
        const formatted = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2,
          maximumFractionDigits: 6,
        }).format(amount);

        return <div className="text-right text-lg font-semibold text-green-600">{formatted}</div>;
      },
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => {
        const payment = row.original;
        const signature = payment.txSignature ?? '';
        const txLink = signature ? getExplorerLink({ transaction: signature, cluster: clusterMoniker }) : null;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => {
                  if (!signature) {
                    toast.error('No transaction signature available to copy');
                    return;
                  }
                  navigator.clipboard.writeText(signature);
                  toast.success('Transaction signature copied');
                }}
              >
                Copy transaction ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                {txLink ? (
                  <a href={txLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4" />
                    View on Explorer
                  </a>
                ) : (
                  <span className="text-xs text-muted-foreground">Explorer link unavailable</span>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
