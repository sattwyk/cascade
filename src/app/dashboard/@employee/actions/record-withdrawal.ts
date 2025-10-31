'use server';

import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { drizzleClientHttp } from '@/db';
import { streamEvents, streams } from '@/db/schema';
import { toNumericString } from '@/lib/numeric';

import { resolveEmployeeContext } from './employee-context';

const InputSchema = z.object({
  streamId: z.string().uuid('Invalid stream identifier.'),
  streamAddress: z.string().min(1, 'Stream address is required.'),
  amount: z.number().positive('Withdrawal amount must be greater than 0.'),
  signature: z.string().min(1).optional().nullable(),
  tokenAccount: z.string().min(1).optional().nullable(),
  mintAddress: z.string().min(1).optional().nullable(),
});

export type RecordEmployeeWithdrawalResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | 'invalid-input'
        | 'database-disabled'
        | 'identity-required'
        | 'employee-not-found'
        | 'stream-not-found'
        | 'insufficient-funds'
        | 'database-error';
      error: string;
    };

export async function recordEmployeeWithdrawal(input: unknown): Promise<RecordEmployeeWithdrawalResult> {
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) {
    const message = parsed.error.issues.at(0)?.message ?? 'Invalid withdrawal input.';
    return { ok: false, reason: 'invalid-input', error: message };
  }

  const context = await resolveEmployeeContext();
  if (context.status !== 'ok') {
    if (context.reason === 'database-disabled') {
      return { ok: false, reason: 'database-disabled', error: 'Database is currently disabled.' };
    }
    if (context.reason === 'identity-required') {
      return { ok: false, reason: 'identity-required', error: 'You must be signed in to record withdrawals.' };
    }
    return { ok: false, reason: 'employee-not-found', error: 'Employee record not found for this session.' };
  }

  try {
    const [streamRecord] = await drizzleClientHttp
      .select({
        id: streams.id,
        totalDeposited: streams.totalDeposited,
        withdrawnAmount: streams.withdrawnAmount,
        organizationId: streams.organizationId,
        employeeId: streams.employeeId,
      })
      .from(streams)
      .where(
        and(
          eq(streams.id, parsed.data.streamId),
          eq(streams.organizationId, context.organizationId),
          eq(streams.employeeId, context.employeeId),
        ),
      )
      .limit(1);

    if (!streamRecord) {
      return {
        ok: false,
        reason: 'stream-not-found',
        error:
          'We could not find this stream in the dashboard database yet. The on-chain withdrawal succeeded, and totals will update once the data syncs.',
      };
    }

    const currentWithdrawn = Number(streamRecord.withdrawnAmount ?? 0);
    const totalDeposited = Number(streamRecord.totalDeposited ?? 0);
    const availableBalance = Math.max(totalDeposited - currentWithdrawn, 0);

    if (parsed.data.amount > availableBalance + 1e-6) {
      return {
        ok: false,
        reason: 'insufficient-funds',
        error: 'Amount exceeds available balance.',
      };
    }

    const updatedWithdrawn = currentWithdrawn + parsed.data.amount;

    await drizzleClientHttp
      .update(streams)
      .set({
        withdrawnAmount: toNumericString(updatedWithdrawn),
        lastActivityAt: new Date(),
      })
      .where(eq(streams.id, parsed.data.streamId));

    await drizzleClientHttp.insert(streamEvents).values({
      streamId: parsed.data.streamId,
      organizationId: context.organizationId,
      eventType: 'stream_withdrawn',
      actorType: 'employee',
      actorAddress: context.walletAddress ?? null,
      signature: parsed.data.signature ?? null,
      tokenAccount: parsed.data.tokenAccount ?? null,
      amount: toNumericString(parsed.data.amount),
      occurredAt: new Date(),
      metadata: {
        streamAddress: parsed.data.streamAddress,
        amount: parsed.data.amount,
        signature: parsed.data.signature ?? null,
        mintAddress: parsed.data.mintAddress ?? null,
      },
    });

    return { ok: true };
  } catch (error) {
    console.error('[employee-withdrawal] Failed to record withdrawal', error);
    return {
      ok: false,
      reason: 'database-error',
      error: 'Unable to record withdrawal. Please try again.',
    };
  }
}
