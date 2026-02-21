'use server';

import * as Sentry from '@sentry/nextjs';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { getStreamsForDashboard } from '@/app/dashboard/data/streams';
import { drizzleClientHttp } from '@/db';
import { streamEvents, streams } from '@/db/schema';
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

    Sentry.logger.info('Stream record created successfully', {
      streamId: streamRecord.id,
      employeeId: input.employeeId,
    });

    return {
      ok: true,
      streamId: streamRecord.id,
      streamAddress: streamRecord.streamAddress,
      createdAt: streamRecord.createdAt,
    } as const;
  } catch (error) {
    Sentry.logger.error('Failed to create stream record', {
      error,
      organizationId,
      employeeId: input.employeeId,
    });
    console.error('Failed to create stream record:', error);
    return {
      ok: false,
      reason: error instanceof Error ? error.message : 'Failed to create stream record',
    } as const;
  }
}

const StreamTopUpInputSchema = z.object({
  streamId: z.string().uuid('Invalid stream identifier.'),
  streamAddress: z.string().min(1, 'Stream address is required.'),
  amount: z.number().positive('Top up amount must be greater than 0.'),
  signature: z.string().min(1).optional().nullable(),
  employerTokenAccount: z.string().min(1).optional().nullable(),
  mintAddress: z.string().min(1).optional().nullable(),
  actorAddress: z.string().min(1).optional().nullable(),
});

export type RecordStreamTopUpResult =
  | { ok: true; totalDeposited: number }
  | {
      ok: false;
      reason:
        | 'invalid-input'
        | 'database-disabled'
        | 'identity-required'
        | 'organization-not-found'
        | 'stream-not-found'
        | 'stream-mismatch'
        | 'database-error';
      error: string;
    };

export async function recordStreamTopUp(input: unknown): Promise<RecordStreamTopUpResult> {
  const parsed = StreamTopUpInputSchema.safeParse(input);
  if (!parsed.success) {
    const message = parsed.error.issues.at(0)?.message ?? 'Invalid top up input.';
    return { ok: false, reason: 'invalid-input', error: message };
  }

  const context = await resolveOrganizationContext();
  if (context.status !== 'ok') {
    if (context.reason === 'database-disabled') {
      return { ok: false, reason: 'database-disabled', error: 'Database is currently disabled.' };
    }
    if (context.reason === 'identity-required') {
      return { ok: false, reason: 'identity-required', error: 'You must be signed in to record top ups.' };
    }
    return { ok: false, reason: 'organization-not-found', error: 'Organization not found for this session.' };
  }

  try {
    const [streamRecord] = await drizzleClientHttp
      .select({
        id: streams.id,
        streamAddress: streams.streamAddress,
        totalDeposited: streams.totalDeposited,
      })
      .from(streams)
      .where(and(eq(streams.id, parsed.data.streamId), eq(streams.organizationId, context.organizationId)))
      .limit(1);

    if (!streamRecord) {
      return {
        ok: false,
        reason: 'stream-not-found',
        error: 'Stream record not found for this organization.',
      };
    }

    if (streamRecord.streamAddress !== parsed.data.streamAddress) {
      return {
        ok: false,
        reason: 'stream-mismatch',
        error: 'Stream address mismatch. Please refresh and try again.',
      };
    }

    const currentDeposited = Number(streamRecord.totalDeposited ?? 0);
    const updatedDeposited = currentDeposited + parsed.data.amount;

    await drizzleClientHttp
      .update(streams)
      .set({
        totalDeposited: toNumericString(updatedDeposited),
        lastActivityAt: new Date(),
      })
      .where(eq(streams.id, parsed.data.streamId));

    await drizzleClientHttp.insert(streamEvents).values({
      streamId: parsed.data.streamId,
      organizationId: context.organizationId,
      eventType: 'stream_top_up',
      actorType: 'employer',
      actorAddress: parsed.data.actorAddress ?? context.primaryWallet ?? null,
      signature: parsed.data.signature ?? null,
      tokenAccount: parsed.data.employerTokenAccount ?? null,
      amount: toNumericString(parsed.data.amount),
      occurredAt: new Date(),
      metadata: {
        streamAddress: parsed.data.streamAddress,
        amount: parsed.data.amount,
        signature: parsed.data.signature ?? null,
        employerTokenAccount: parsed.data.employerTokenAccount ?? null,
        mintAddress: parsed.data.mintAddress ?? null,
      },
    });

    Sentry.logger.info('Stream top up recorded successfully', {
      streamId: parsed.data.streamId,
      amount: parsed.data.amount,
    });

    return { ok: true, totalDeposited: updatedDeposited };
  } catch (error) {
    Sentry.logger.error('Failed to record stream top up', { error, streamId: parsed.data.streamId });
    console.error('[stream-top-up] Failed to record top up', error);
    return {
      ok: false,
      reason: 'database-error',
      error: 'Unable to record top up. Please try again.',
    };
  }
}
