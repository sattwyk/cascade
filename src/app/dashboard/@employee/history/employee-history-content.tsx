'use client';

import { useMemo } from 'react';

import { type SolanaClusterMoniker } from 'gill';
import { CircleDollarSign, LineChart, Wallet } from 'lucide-react';

import type { EmployeeWithdrawal } from '@/app/dashboard/@employee/actions/withdrawal-history';
import { useSolana } from '@/components/solana/use-solana';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WalletDropdown } from '@/components/wallet-dropdown';
import { useEmployeeWithdrawalsQuery } from '@/features/employee-dashboard/data-access/use-employee-withdrawals-query';

import { getEmployeeHistoryColumns, type Payment } from './columns';
import { DataTable } from './data-table';

const CURRENCY_FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 6,
});

interface EmployeeHistoryContentProps {
  initialData: EmployeeWithdrawal[];
}

export function EmployeeHistoryContent({ initialData }: EmployeeHistoryContentProps) {
  const { account, connected, cluster } = useSolana();
  const clusterMoniker = cluster.id.replace('solana:', '') as SolanaClusterMoniker;
  const { data = initialData } = useEmployeeWithdrawalsQuery({ initialData });

  const payments: Payment[] = useMemo(
    () =>
      data.map((entry) => ({
        id: entry.id,
        amount: entry.amount,
        employer: entry.employerName ?? null,
        timestamp: entry.occurredAt ? new Date(entry.occurredAt) : null,
        txSignature: entry.signature ?? null,
        status: 'completed',
      })),
    [data],
  );

  const totalWithdrawn = useMemo(
    () => payments.reduce((sum, payment) => sum + (Number.isFinite(payment.amount) ? payment.amount : 0), 0),
    [payments],
  );

  const totalTransactions = payments.length;
  const averagePayment = totalTransactions > 0 ? totalWithdrawn / totalTransactions : 0;

  if (!connected || !account) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Card className="w-full max-w-md p-8">
          <div className="flex flex-col items-center space-y-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Wallet className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Connect Your Wallet</h2>
              <p className="text-muted-foreground">Connect your wallet to view your payment history</p>
            </div>
            <WalletDropdown />
          </div>
        </Card>
      </div>
    );
  }

  const columns = useMemo(() => getEmployeeHistoryColumns(clusterMoniker), [clusterMoniker]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payment History</h1>
        <p className="text-muted-foreground">View and manage your complete withdrawal history</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="flex items-center gap-2 text-xs font-medium sm:text-sm">
              <CircleDollarSign className="h-3 w-3 shrink-0 sm:h-4 sm:w-4" />
              <span className="truncate">Total Withdrawn</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold sm:text-2xl">{CURRENCY_FORMATTER.format(totalWithdrawn)}</p>
            <p className="mt-1 text-xs text-muted-foreground">All-time withdrawals</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="flex items-center gap-2 text-xs font-medium sm:text-sm">
              <Wallet className="h-3 w-3 shrink-0 sm:h-4 sm:w-4" />
              <span className="truncate">Total Transactions</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold sm:text-2xl">{totalTransactions}</p>
            <p className="mt-1 text-xs text-muted-foreground">Payment history</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="flex items-center gap-2 text-xs font-medium sm:text-sm">
              <LineChart className="h-3 w-3 shrink-0 sm:h-4 sm:w-4" />
              <span className="truncate">Average Payment</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold sm:text-2xl">{CURRENCY_FORMATTER.format(averagePayment || 0)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Per transaction</p>
          </CardContent>
        </Card>
      </div>

      <Card className="p-6">
        <DataTable columns={columns} data={payments} />
      </Card>
    </div>
  );
}
