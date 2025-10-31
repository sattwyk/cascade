'use server';

import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';

import { drizzleClientHttp } from '@/db';
import { streams } from '@/db/schema';

import { resolveOrganizationContext } from './organization-context';

const InputSchema = z.object({
  employeeId: z.string().uuid('Invalid employee identifier.'),
});

export type EmployeeStreamSummary = {
  id: string;
  streamAddress: string;
  vaultAddress: string;
  mintAddress: string;
  status: string;
  hourlyRate: number | null;
  totalDeposited: number | null;
  withdrawnAmount: number | null;
  createdAt: string | null;
  closedAt: string | null;
};

export type GetEmployeeStreamsResult =
  | {
      ok: true;
      streams: EmployeeStreamSummary[];
    }
  | {
      ok: false;
      reason: 'invalid-employee-id' | 'identity-required' | 'organization-not-found' | 'unknown';
      error: string;
    };

export async function getEmployeeStreams(input: unknown): Promise<GetEmployeeStreamsResult> {
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) {
    const message = parsed.error.issues.at(0)?.message ?? 'Invalid employee identifier.';
    return { ok: false, reason: 'invalid-employee-id', error: message };
  }

  const organizationContext = await resolveOrganizationContext();
  if (organizationContext.status !== 'ok') {
    if (organizationContext.reason === 'database-disabled') {
      return { ok: true, streams: [] };
    }

    const error =
      organizationContext.reason === 'identity-required'
        ? 'You must be signed in to view employee streams.'
        : 'Organization not found for the current session.';

    return { ok: false, reason: organizationContext.reason, error };
  }

  try {
    const rows = await drizzleClientHttp
      .select({
        id: streams.id,
        streamAddress: streams.streamAddress,
        vaultAddress: streams.vaultAddress,
        mintAddress: streams.mintAddress,
        status: streams.status,
        hourlyRate: streams.hourlyRate,
        totalDeposited: streams.totalDeposited,
        withdrawnAmount: streams.withdrawnAmount,
        createdAt: streams.createdAt,
        closedAt: streams.closedAt,
      })
      .from(streams)
      .where(
        and(
          eq(streams.organizationId, organizationContext.organizationId),
          eq(streams.employeeId, parsed.data.employeeId),
        ),
      )
      .orderBy(desc(streams.createdAt));

    return {
      ok: true,
      streams: rows.map((row) => ({
        id: row.id,
        streamAddress: row.streamAddress,
        vaultAddress: row.vaultAddress,
        mintAddress: row.mintAddress,
        status: row.status ?? 'active',
        hourlyRate: row.hourlyRate != null ? Number(row.hourlyRate) : null,
        totalDeposited: row.totalDeposited != null ? Number(row.totalDeposited) : null,
        withdrawnAmount: row.withdrawnAmount != null ? Number(row.withdrawnAmount) : null,
        createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : null,
        closedAt: row.closedAt instanceof Date ? row.closedAt.toISOString() : null,
      })),
    };
  } catch (error) {
    console.error('[employee-streams] Failed to load employee streams', error);
    return {
      ok: false,
      reason: 'unknown',
      error: 'We could not load the employee streams. Please try again later.',
    };
  }
}
