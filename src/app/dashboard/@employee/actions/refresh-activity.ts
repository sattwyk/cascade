'use server';

import * as Sentry from '@sentry/nextjs';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { drizzleClientHttp } from '@/db';
import { streamEvents, streams } from '@/db/schema';

import { resolveEmployeeContext } from './employee-context';

const InputSchema = z.object({
  streamId: z.string().uuid('Invalid stream identifier.'),
  streamAddress: z.string().min(1, 'Stream address is required.'),
  signature: z.string().min(1).optional().nullable(),
});

export type RecordEmployeeRefreshResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | 'invalid-input'
        | 'database-disabled'
        | 'identity-required'
        | 'employee-not-found'
        | 'stream-not-found'
        | 'database-error';
      error: string;
    };

export async function recordEmployeeActivityRefresh(input: unknown): Promise<RecordEmployeeRefreshResult> {
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) {
    const message = parsed.error.issues.at(0)?.message ?? 'Invalid refresh activity input.';
    return { ok: false, reason: 'invalid-input', error: message };
  }

  const context = await resolveEmployeeContext();
  if (context.status !== 'ok') {
    if (context.reason === 'database-disabled') {
      return { ok: false, reason: 'database-disabled', error: 'Database is currently disabled.' };
    }
    if (context.reason === 'identity-required') {
      return { ok: false, reason: 'identity-required', error: 'You must be signed in to refresh activity.' };
    }
    return { ok: false, reason: 'employee-not-found', error: 'Employee record not found for this session.' };
  }

  try {
    const [streamRecord] = await drizzleClientHttp
      .select({
        id: streams.id,
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
      return { ok: false, reason: 'stream-not-found', error: 'Stream could not be found.' };
    }

    const now = new Date();

    await drizzleClientHttp
      .update(streams)
      .set({
        lastActivityAt: now,
      })
      .where(eq(streams.id, parsed.data.streamId));

    await drizzleClientHttp.insert(streamEvents).values({
      streamId: parsed.data.streamId,
      organizationId: context.organizationId,
      eventType: 'stream_refresh_activity',
      actorType: 'employee',
      actorAddress: context.walletAddress ?? null,
      signature: parsed.data.signature ?? null,
      occurredAt: now,
      metadata: {
        streamAddress: parsed.data.streamAddress,
        signature: parsed.data.signature ?? null,
      },
    });

    return { ok: true };
  } catch (error) {
    Sentry.logger.error('Failed to record employee refresh activity', {
      error,
      streamId: parsed.data.streamId,
      organizationId: context.organizationId,
      employeeId: context.employeeId,
    });
    console.error('[employee-refresh-activity] Failed to record refresh', error);
    return { ok: false, reason: 'database-error', error: 'Unable to record activity refresh. Please try again.' };
  }
}
