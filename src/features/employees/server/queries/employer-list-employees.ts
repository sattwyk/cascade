import { and, desc, eq, sql } from 'drizzle-orm';

import { drizzleClientHttp } from '@/core/db';
import { employees, streams } from '@/core/db/schema';
import { resolveOrganizationContext } from '@/features/organization/server/actions/organization-context';
import type { EmployeeSummary } from '@/types/employee';

export type DashboardEmployee = EmployeeSummary;

function toNumber(value: unknown): number | null {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function getEmployeesForDashboard(): Promise<DashboardEmployee[]> {
  const context = await resolveOrganizationContext();
  if (context.status !== 'ok') {
    return [];
  }

  const rows = await drizzleClientHttp
    .select({
      id: employees.id,
      fullName: employees.fullName,
      email: employees.email,
      status: employees.status,
      department: employees.department,
      location: employees.location,
      employmentType: employees.employmentType,
      primaryWallet: employees.primaryWallet,
      hourlyRateReference: employees.hourlyRateReference,
      invitedAt: employees.invitedAt,
      createdAt: employees.createdAt,
      linkedStreams: sql<number>`count(${streams.id})::bigint`,
      tags: employees.tags,
    })
    .from(employees)
    .leftJoin(streams, and(eq(streams.employeeId, employees.id), eq(streams.organizationId, employees.organizationId)))
    .where(eq(employees.organizationId, context.organizationId))
    .groupBy(
      employees.id,
      employees.fullName,
      employees.email,
      employees.status,
      employees.department,
      employees.location,
      employees.employmentType,
      employees.primaryWallet,
      employees.hourlyRateReference,
      employees.invitedAt,
      employees.createdAt,
      employees.tags,
    )
    .orderBy(desc(employees.createdAt));

  return rows.map((row) => ({
    id: row.id,
    name: row.fullName,
    email: row.email ?? null,
    status: row.status ?? 'draft',
    department: row.department ?? null,
    location: row.location ?? null,
    employmentType: row.employmentType ?? null,
    primaryWallet: row.primaryWallet ?? null,
    hourlyRateUsd: toNumber(row.hourlyRateReference),
    linkedStreams: Number(row.linkedStreams ?? 0),
    invitedAt: row.invitedAt?.toISOString?.() ?? null,
    createdAt: row.createdAt?.toISOString?.() ?? new Date().toISOString(),
    tags: Array.isArray(row.tags) ? row.tags.filter((tag): tag is string => typeof tag === 'string') : [],
  }));
}
