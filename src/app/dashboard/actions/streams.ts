'use server';

import { getStreamsForDashboard } from '@/app/dashboard/data/streams';
import { drizzleClientHttp } from '@/db';
import { streams } from '@/db/schema';
import { toNumericString } from '@/lib/numeric';
import type { DashboardStream } from '@/types/stream';

import { createActivityLog } from './activity-log';
import { resolveOrganizationContext } from './organization-context';

export async function getDashboardStreams(): Promise<DashboardStream[]> {
  return getStreamsForDashboard();
}

export type CreateStreamInput = {
  streamAddress: string;
  vaultAddress: string;
  employeeId: string;
  employerWallet: string;
  employerTokenAccount: string;
  mintAddress: string;
  hourlyRate: number | bigint;
  totalDeposited: number | bigint;
  createdSignature?: string;
  cluster?: 'devnet' | 'testnet' | 'mainnet' | 'localnet' | 'custom' | string; // Allow string for chain-prefixed values
  metadata?: Record<string, unknown>;
};

export async function createStreamRecord(input: CreateStreamInput) {
  const context = await resolveOrganizationContext();
  if (context.status !== 'ok') {
    return { ok: false, reason: context.reason } as const;
  }

  const { organizationId } = context;

  try {
    // Normalize cluster value - remove chain prefix if present (e.g., "solana:devnet" -> "devnet")
    const clusterValue = input.cluster ?? 'devnet';
    const normalizedCluster = clusterValue.includes(':') ? clusterValue.split(':')[1] : clusterValue;

    // Validate cluster is one of the allowed values
    const validClusters: readonly string[] = ['devnet', 'testnet', 'mainnet', 'localnet', 'custom'];
    const cluster = (validClusters.includes(normalizedCluster) ? normalizedCluster : 'devnet') as
      | 'devnet'
      | 'testnet'
      | 'mainnet'
      | 'localnet'
      | 'custom';

    // Insert stream record
    const values = {
      organizationId,
      employeeId: input.employeeId,
      streamAddress: input.streamAddress,
      vaultAddress: input.vaultAddress,
      employerWallet: input.employerWallet,
      employerTokenAccount: input.employerTokenAccount,
      mintAddress: input.mintAddress,
      hourlyRate: toNumericString(input.hourlyRate),
      totalDeposited: toNumericString(input.totalDeposited),
      withdrawnAmount: toNumericString(0),
      status: 'active' as const,
      cluster,
      createdAt: new Date(),
      lastActivityAt: new Date(),
      createdSignature: input.createdSignature ?? null,
      metadata: input.metadata ?? {},
    };

    const [streamRecord] = await drizzleClientHttp.insert(streams).values(values).returning({
      id: streams.id,
      streamAddress: streams.streamAddress,
      createdAt: streams.createdAt,
    });

    // Create activity log entry
    await createActivityLog({
      streamId: streamRecord.id,
      employeeId: input.employeeId,
      title: 'Payment stream created',
      description: `New payment stream created with hourly rate of ${input.hourlyRate} tokens`,
      activityType: 'stream_created',
      actorType: 'employer',
      actorAddress: input.employerWallet,
      status: 'success',
      metadata: {
        streamAddress: input.streamAddress,
        vaultAddress: input.vaultAddress,
        mintAddress: input.mintAddress,
        hourlyRate: input.hourlyRate.toString(),
        totalDeposited: input.totalDeposited.toString(),
        signature: input.createdSignature,
      },
    });

    return {
      ok: true,
      streamId: streamRecord.id,
      streamAddress: streamRecord.streamAddress,
      createdAt: streamRecord.createdAt,
    } as const;
  } catch (error) {
    console.error('Failed to create stream record:', error);
    return {
      ok: false,
      reason: error instanceof Error ? error.message : 'Failed to create stream record',
    } as const;
  }
}
