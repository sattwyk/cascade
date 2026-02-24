'use server';

import { differenceInCalendarDays } from 'date-fns';
import { and, desc, eq } from 'drizzle-orm';

import { drizzleClientHttp } from '@/core/db';
import { streamEvents, streams } from '@/core/db/schema';

import { resolveEmployeeContext } from './employee-context';

export type EmployeeDashboardOverview = {
  organization: {
    id: string;
    name: string | null;
  } | null;
  employee: {
    id: string;
    name: string | null;
  } | null;
  stats: {
    totalEarned: number;
    availableToWithdraw: number;
    activeStreams: number;
  };
  activity: {
    lastActivityAt: string | null;
    daysUntilEmployerWithdrawal: number | null;
  };
  streams: Array<{
    id: string;
    employerName: string | null;
    employerWallet: string | null;
    streamAddress: string;
    vaultAddress: string;
    mintAddress: string | null;
    status: string;
    hourlyRate: number;
    totalEarned: number;
    withdrawnAmount: number;
    availableBalance: number;
    createdAt: string | null;
    lastActivityAt: string | null;
  }>;
  recentWithdrawals: Array<{
    id: string;
    streamId: string | null;
    amount: number;
    occurredAt: string | null;
    signature: string | null;
  }>;
};

const EMPTY_OVERVIEW: EmployeeDashboardOverview = {
  organization: null,
  employee: null,
  stats: {
    totalEarned: 0,
    availableToWithdraw: 0,
    activeStreams: 0,
  },
  activity: {
    lastActivityAt: null,
    daysUntilEmployerWithdrawal: null,
  },
  streams: [],
  recentWithdrawals: [],
};

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

const AMOUNT_DECIMALS = 6;

function roundAmount(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Number(value.toFixed(AMOUNT_DECIMALS));
}

function computeVestedBalance({
  hourlyRate,
  totalDeposited,
  withdrawnAmount,
  createdAt,
}: {
  hourlyRate: number;
  totalDeposited: number;
  withdrawnAmount: number;
  createdAt: Date | null;
}) {
  if (!createdAt || hourlyRate <= 0 || totalDeposited <= 0) {
    return { earned: 0, available: 0 };
  }

  const secondsElapsed = Math.max(0, Math.floor((Date.now() - createdAt.getTime()) / 1000));
  const hoursElapsed = Math.floor(secondsElapsed / 3600);
  if (hoursElapsed <= 0) {
    return { earned: 0, available: 0 };
  }

  const earnedUncapped = hourlyRate * hoursElapsed;
  const earned = Math.min(earnedUncapped, totalDeposited);
  const available = Math.max(earned - withdrawnAmount, 0);

  return {
    earned: roundAmount(earned),
    available: roundAmount(available),
  };
}

export async function getEmployeeDashboardOverview(): Promise<EmployeeDashboardOverview> {
  const context = await resolveEmployeeContext();
  if (context.status !== 'ok') {
    return EMPTY_OVERVIEW;
  }

  const { employeeId, organizationId, organizationName, employeeName } = context;

  const streamRows = await drizzleClientHttp
    .select({
      id: streams.id,
      employerWallet: streams.employerWallet,
      streamAddress: streams.streamAddress,
      vaultAddress: streams.vaultAddress,
      mintAddress: streams.mintAddress,
      status: streams.status,
      hourlyRate: streams.hourlyRate,
      totalDeposited: streams.totalDeposited,
      withdrawnAmount: streams.withdrawnAmount,
      createdAt: streams.createdAt,
      lastActivityAt: streams.lastActivityAt,
    })
    .from(streams)
    .where(and(eq(streams.organizationId, organizationId), eq(streams.employeeId, employeeId)));

  let totalEarned = 0;
  let availableToWithdraw = 0;
  let lastActivityIso: string | null = null;

  const streamSummaries = streamRows.map((row) => {
    const hourlyRate = toNumber(row.hourlyRate);
    const totalDeposited = toNumber(row.totalDeposited);
    const withdrawnAmount = toNumber(row.withdrawnAmount);
    const createdAtDate = row.createdAt instanceof Date ? row.createdAt : null;
    const createdAtIso = createdAtDate ? createdAtDate.toISOString() : null;
    const lastActivity = row.lastActivityAt instanceof Date ? row.lastActivityAt.toISOString() : null;
    const { earned, available } = computeVestedBalance({
      hourlyRate,
      totalDeposited,
      withdrawnAmount,
      createdAt: createdAtDate,
    });

    totalEarned += earned;
    availableToWithdraw += available;

    if (lastActivity) {
      if (!lastActivityIso || new Date(lastActivity) > new Date(lastActivityIso)) {
        lastActivityIso = lastActivity;
      }
    }

    return {
      id: row.id,
      employerName: organizationName ?? null,
      employerWallet: row.employerWallet ?? null,
      streamAddress: row.streamAddress,
      vaultAddress: row.vaultAddress,
      status: row.status ?? 'active',
      mintAddress: row.mintAddress ?? null,
      hourlyRate,
      totalEarned: earned,
      withdrawnAmount,
      availableBalance: available,
      createdAt: createdAtIso,
      lastActivityAt: lastActivity,
    };
  });

  const activeStreams = streamSummaries.filter((stream) => stream.status === 'active');

  const withdrawalRows = await drizzleClientHttp
    .select({
      id: streamEvents.id,
      streamId: streamEvents.streamId,
      amount: streamEvents.amount,
      occurredAt: streamEvents.occurredAt,
      signature: streamEvents.signature,
    })
    .from(streamEvents)
    .innerJoin(streams, eq(streams.id, streamEvents.streamId))
    .where(
      and(
        eq(streamEvents.organizationId, organizationId),
        eq(streamEvents.eventType, 'stream_withdrawn'),
        eq(streams.employeeId, employeeId),
      ),
    )
    .orderBy(desc(streamEvents.occurredAt))
    .limit(5);

  const withdrawals = withdrawalRows.map((row) => ({
    id: row.id,
    streamId: row.streamId,
    amount: toNumber(row.amount),
    occurredAt: row.occurredAt instanceof Date ? row.occurredAt.toISOString() : null,
    signature: row.signature ?? null,
  }));

  const daysUntilEmployerWithdrawal =
    lastActivityIso != null ? Math.max(0, 30 - differenceInCalendarDays(new Date(), new Date(lastActivityIso))) : null;

  return {
    organization: {
      id: organizationId,
      name: organizationName ?? null,
    },
    employee: {
      id: employeeId,
      name: employeeName ?? null,
    },
    stats: {
      totalEarned,
      availableToWithdraw,
      activeStreams: activeStreams.length,
    },
    activity: {
      lastActivityAt: lastActivityIso,
      daysUntilEmployerWithdrawal,
    },
    streams: streamSummaries,
    recentWithdrawals: withdrawals,
  };
}
