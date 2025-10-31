'use server';

import { and, desc, eq } from 'drizzle-orm';

import { drizzleClientHttp } from '@/db';
import { streamEvents, streams } from '@/db/schema';

import { resolveEmployeeContext } from './employee-context';

export type EmployeeWithdrawal = {
  id: string;
  streamId: string | null;
  amount: number;
  occurredAt: string | null;
  signature: string | null;
  employerName: string | null;
};

export async function getEmployeeWithdrawalHistory(): Promise<EmployeeWithdrawal[]> {
  const context = await resolveEmployeeContext();
  if (context.status !== 'ok') {
    return [];
  }

  try {
    const rows = await drizzleClientHttp
      .select({
        id: streamEvents.id,
        streamId: streamEvents.streamId,
        amount: streamEvents.amount,
        occurredAt: streamEvents.occurredAt,
        signature: streamEvents.signature,
        employerName: streams.employerWallet,
      })
      .from(streamEvents)
      .innerJoin(streams, eq(streams.id, streamEvents.streamId))
      .where(
        and(
          eq(streamEvents.organizationId, context.organizationId),
          eq(streams.employeeId, context.employeeId),
          eq(streamEvents.eventType, 'stream_withdrawn'),
        ),
      )
      .orderBy(desc(streamEvents.occurredAt))
      .limit(100);

    return rows.map((row) => ({
      id: row.id,
      streamId: row.streamId,
      amount: Number(row.amount ?? 0),
      occurredAt: row.occurredAt instanceof Date ? row.occurredAt.toISOString() : null,
      signature: row.signature ?? null,
      employerName: row.employerName ?? null,
    }));
  } catch (error) {
    console.error('[employee-withdrawals] Failed to load withdrawal history', error);
    return [];
  }
}
