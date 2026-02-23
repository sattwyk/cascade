'use client';

import { useState } from 'react';

import { formatDistanceToNow } from 'date-fns';
import { ArrowDownToLine, TrendingUp, Wallet } from 'lucide-react';

import { EmptyState } from '@/components/dashboard/empty-state';
import { useSolana } from '@/components/solana/use-solana';
import { Badge } from '@/core/ui/badge';
import { Button } from '@/core/ui/button';
import { Card } from '@/core/ui/card';
import { WithdrawModal } from '@/features/employees/components/withdraw-modal';

const AMOUNT_DECIMALS = 6;

export default function EmployeeStreamsPage() {
  const { account, connected } = useSolana();
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [selectedStream, setSelectedStream] = useState<{
    id: string;
    employerName: string;
    employerAddress: string;
    employerWallet: string | null;
    streamAddress: string;
    vaultAddress: string;
    mintAddress: string | null;
    availableBalance: number;
  } | null>(null);

  const handleWithdrawClick = (stream: (typeof streams)[number]) => {
    setSelectedStream({
      ...stream,
      employerWallet: stream.employerAddress,
    });
    setWithdrawModalOpen(true);
  };

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
              <p className="text-muted-foreground">Connect your wallet to view your payment streams</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Mock data - TODO: Fetch streams from blockchain
  const streams = [
    {
      id: '1',
      employerName: 'Acme Corp',
      employerAddress: '7xKXtg2vJ8kxKFGH3qK9pL2mN5oP7rQ8sT9uV1wX2yZ3',
      streamAddress: '7xKXtg2vJ8kxKFGH3qK9pL2mN5oP7rQ8sT9uV1wX2yZ3',
      vaultAddress: '9yHKdg4xL0mzMHIJ5sM1rN4oP7qR9tS0uV1wX3yZ4aB5',
      mintAddress: 'Mint111111111111111111111111111111111111',
      status: 'active' as const,
      hourlyRate: 25.0,
      availableBalance: 850.25,
      totalEarned: 6250.0,
      startDate: new Date('2025-10-01'),
      hoursWorked: 250,
    },
    {
      id: '2',
      employerName: 'TechStart Inc',
      employerAddress: '9yHKdg4xL0mzMHIJ5sM1rN4oP7qR9tS0uV1wX3yZ4aB5',
      streamAddress: '5yHKdg4xL0mzMHIJ5sM1rN4oP7qR9tS0uV1wX3yZ4aB5',
      vaultAddress: '8bMZvi5yM1n0NIJk6tN2sO5pQ8rS0uT1vW2xY4zA5bC6',
      mintAddress: 'Mint111111111111111111111111111111111111',
      status: 'active' as const,
      hourlyRate: 20.0,
      availableBalance: 400.25,
      totalEarned: 3200.5,
      startDate: new Date('2025-10-15'),
      hoursWorked: 160,
    },
    {
      id: '3',
      employerName: 'BuildLabs',
      employerAddress: '8bMZvi5yM1n0NIJk6tN2sO5pQ8rS0uT1vW2xY4zA5bC6',
      streamAddress: '3hSF4p0dR6s5SNPp1yS7xT0uV3wX5yY6zA9aB0cD1eF2',
      vaultAddress: '2gRE3o9cQ5r4RMOo0xR6wS9tU2vW4xX5yZ8aB9cD0eF1',
      mintAddress: 'Mint111111111111111111111111111111111111',
      status: 'paused' as const,
      hourlyRate: 30.0,
      availableBalance: 0,
      totalEarned: 2800.0,
      startDate: new Date('2025-09-20'),
      hoursWorked: 93.3,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Streams</h1>
          <p className="text-muted-foreground">View and manage your payment streams</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Total Streams</p>
          <p className="text-2xl font-bold">{streams.length}</p>
        </div>
      </div>

      {streams.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            title="No Payment Streams"
            description="You don't have any payment streams yet. Contact your employer to get started."
          />
        </Card>
      ) : (
        <div className="grid gap-4">
          {streams.map((stream) => (
            <Card key={stream.id} className="p-6">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-semibold">{stream.employerName}</h3>
                      <Badge
                        variant="outline"
                        className={
                          stream.status === 'active'
                            ? 'border-green-200 bg-green-500/10 text-green-700'
                            : 'border-yellow-200 bg-yellow-500/10 text-yellow-700'
                        }
                      >
                        <span
                          className={`mr-1.5 flex h-1.5 w-1.5 rounded-full ${stream.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'}`}
                        />
                        {stream.status}
                      </Badge>
                    </div>
                    <code className="text-xs text-muted-foreground">
                      {stream.employerAddress.slice(0, 8)}...{stream.employerAddress.slice(-8)}
                    </code>
                  </div>
                  {stream.availableBalance > 0 && (
                    <Button className="gap-2" onClick={() => handleWithdrawClick(stream)}>
                      <ArrowDownToLine className="h-4 w-4" />
                      Withdraw ${stream.availableBalance.toFixed(AMOUNT_DECIMALS)}
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 border-t pt-4 md:grid-cols-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Hourly Rate</p>
                    <p className="text-lg font-semibold">${stream.hourlyRate.toFixed(AMOUNT_DECIMALS)}/hr</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Hours Worked</p>
                    <p className="text-lg font-semibold">{stream.hoursWorked.toFixed(1)}h</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Earned</p>
                    <p className="text-lg font-semibold text-green-600">
                      ${stream.totalEarned.toFixed(AMOUNT_DECIMALS)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Started</p>
                    <p className="text-lg font-semibold">
                      {formatDistanceToNow(stream.startDate, { addSuffix: true })}
                    </p>
                  </div>
                </div>

                {stream.availableBalance > 0 && (
                  <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-500/10 p-3">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-900">Available to withdraw</p>
                      <p className="text-xs text-green-700">Ready for immediate withdrawal</p>
                    </div>
                    <p className="text-xl font-bold text-green-600">
                      ${stream.availableBalance.toFixed(AMOUNT_DECIMALS)}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {selectedStream && (
        <WithdrawModal
          isOpen={withdrawModalOpen}
          onClose={() => {
            setWithdrawModalOpen(false);
            setSelectedStream(null);
          }}
          stream={{
            id: selectedStream.id,
            employerName: selectedStream.employerName,
            employerWallet: selectedStream.employerWallet ?? selectedStream.employerAddress ?? null,
            streamAddress: selectedStream.streamAddress,
            vaultAddress: selectedStream.vaultAddress,
            mintAddress: selectedStream.mintAddress,
            availableBalance: selectedStream.availableBalance,
          }}
        />
      )}
    </div>
  );
}
