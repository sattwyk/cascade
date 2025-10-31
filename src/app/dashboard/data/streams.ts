import { and, desc, eq } from 'drizzle-orm';

import { drizzleClientHttp } from '@/db';
import { employees, organizationTokenAccounts, streams } from '@/db/schema';
import { StreamState } from '@/lib/enums';
import type { DashboardStream } from '@/types/stream';

import { resolveOrganizationContext } from '../actions/organization-context';

function toIsoString(value: Date | null | undefined): string | null {
  if (!value) return null;
  try {
    return value.toISOString();
  } catch (error) {
    console.warn('[dashboard] Failed to serialize date value', error);
    return null;
  }
}

export async function getStreamsForDashboard(): Promise<DashboardStream[]> {
  const context = await resolveOrganizationContext();
  if (context.status !== 'ok') {
    return [];
  }

  const rows = await drizzleClientHttp
    .select({
      id: streams.id,
      employeeId: streams.employeeId,
      employeeName: employees.fullName,
      employeeWallet: employees.primaryWallet,
      streamAddress: streams.streamAddress,
      vaultAddress: streams.vaultAddress,
      employerWallet: streams.employerWallet,
      employerTokenAccount: streams.employerTokenAccount,
      mintAddress: streams.mintAddress,
      tokenLabel: organizationTokenAccounts.label,
      hourlyRate: streams.hourlyRate,
      totalDeposited: streams.totalDeposited,
      withdrawnAmount: streams.withdrawnAmount,
      status: streams.status,
      cluster: streams.cluster,
      createdAt: streams.createdAt,
      lastActivityAt: streams.lastActivityAt,
      deactivatedAt: streams.deactivatedAt,
      closedAt: streams.closedAt,
    })
    .from(streams)
    .leftJoin(
      employees,
      and(eq(employees.id, streams.employeeId), eq(employees.organizationId, streams.organizationId)),
    )
    .leftJoin(
      organizationTokenAccounts,
      and(
        eq(organizationTokenAccounts.organizationId, streams.organizationId),
        eq(organizationTokenAccounts.tokenAccountAddress, streams.employerTokenAccount),
      ),
    )
    .where(eq(streams.organizationId, context.organizationId))
    .orderBy(desc(streams.createdAt));

  return rows.map((row) => {
    const totalDeposited = Number(row.totalDeposited ?? 0);
    const withdrawnAmount = Number(row.withdrawnAmount ?? 0);
    const vaultBalance = Math.max(totalDeposited - withdrawnAmount, 0);
    const status = Object.values(StreamState).includes(row.status as StreamState)
      ? (row.status as StreamState)
      : StreamState.DRAFT;

    return {
      id: row.id,
      employeeId: row.employeeId ?? null,
      employeeName: row.employeeName ?? 'Unassigned employee',
      employeeWallet: row.employeeWallet ?? null,
      streamAddress: row.streamAddress,
      vaultAddress: row.vaultAddress,
      employerWallet: row.employerWallet,
      employerTokenAccount: row.employerTokenAccount,
      mintAddress: row.mintAddress,
      mintLabel: row.tokenLabel ?? row.mintAddress,
      hourlyRate: Number(row.hourlyRate ?? 0),
      totalDeposited,
      withdrawnAmount,
      vaultBalance,
      availableToWithdraw: vaultBalance,
      status,
      cluster: row.cluster,
      createdAt: toIsoString(row.createdAt) ?? new Date().toISOString(),
      lastActivityAt: toIsoString(row.lastActivityAt),
      deactivatedAt: toIsoString(row.deactivatedAt),
      closedAt: toIsoString(row.closedAt),
    } satisfies DashboardStream;
  });
}
