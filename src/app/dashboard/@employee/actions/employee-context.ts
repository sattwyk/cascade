'use server';

import { cookies, headers } from 'next/headers';

import { and, eq, or } from 'drizzle-orm';

import { drizzleClientHttp } from '@/db';
import { employees, organizations, organizationUsers } from '@/db/schema';

const hasDatabase = Boolean(process.env.DATABASE_URL?.trim());

export type EmployeeContext =
  | {
      status: 'ok';
      organizationId: string;
      organizationName: string | null;
      employeeId: string;
      employeeName: string | null;
      walletAddress: string | null;
      email: string | null;
    }
  | {
      status: 'error';
      reason: 'database-disabled' | 'identity-required' | 'employee-not-found';
    };

function normalizeEmail(value?: string | null) {
  if (!value) return null;
  return value.trim().toLowerCase();
}

function normalizeWallet(value?: string | null) {
  if (!value) return null;
  return value.trim();
}

export async function resolveEmployeeContext(): Promise<EmployeeContext> {
  if (!hasDatabase) {
    return { status: 'error', reason: 'database-disabled' };
  }

  const cookieStore = await cookies();
  const headerStore = await headers();

  const email =
    normalizeEmail(cookieStore.get('cascade-user-email')?.value) ??
    normalizeEmail(headerStore.get('x-cascade-user-email'));

  const wallet =
    normalizeWallet(cookieStore.get('cascade-wallet')?.value) ?? normalizeWallet(headerStore.get('x-cascade-wallet'));

  if (!email && !wallet) {
    return { status: 'error', reason: 'identity-required' };
  }

  const identityConditions = [];
  if (email) {
    identityConditions.push(eq(organizationUsers.email, email));
  }
  if (wallet) {
    identityConditions.push(eq(organizationUsers.walletAddress, wallet));
  }

  if (identityConditions.length === 0) {
    return { status: 'error', reason: 'identity-required' };
  }

  const identityCondition = identityConditions.length === 1 ? identityConditions[0]! : or(...identityConditions);

  const whereCondition = and(eq(organizationUsers.role, 'employee'), identityCondition);

  const matches = await drizzleClientHttp
    .select({
      organizationId: organizationUsers.organizationId,
      organizationName: organizations.name,
      employeeId: organizationUsers.employeeId,
      displayName: organizationUsers.displayName,
      walletAddress: organizationUsers.walletAddress,
      email: organizationUsers.email,
      employeeFullName: employees.fullName,
    })
    .from(organizationUsers)
    .innerJoin(organizations, eq(organizationUsers.organizationId, organizations.id))
    .leftJoin(employees, eq(organizationUsers.employeeId, employees.id))
    .where(whereCondition)
    .limit(5);

  const prioritized = matches.find((entry) => entry.employeeId != null) ?? matches.at(0);

  if (!prioritized || !prioritized.employeeId) {
    return { status: 'error', reason: 'employee-not-found' };
  }

  return {
    status: 'ok',
    organizationId: prioritized.organizationId,
    organizationName: prioritized.organizationName ?? null,
    employeeId: prioritized.employeeId,
    employeeName: prioritized.employeeFullName ?? prioritized.displayName ?? null,
    walletAddress: prioritized.walletAddress ?? null,
    email: prioritized.email ?? null,
  };
}
