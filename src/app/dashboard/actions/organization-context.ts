'use server';

import { cookies, headers } from 'next/headers';

import { eq, or } from 'drizzle-orm';

import { drizzleClientHttp } from '@/db';
import { organizations, organizationUsers } from '@/db/schema';

const hasDatabase = Boolean(process.env.DATABASE_URL?.trim());

export type OrganizationContext =
  | {
      status: 'ok';
      organizationId: string;
      accountState: string | null;
      primaryWallet: string | null;
    }
  | {
      status: 'error';
      reason: 'organization-not-found' | 'identity-required' | 'database-disabled';
    };

function normalizeEmail(value?: string | null) {
  if (!value) return null;
  return value.trim().toLowerCase();
}

function normalizeWallet(value?: string | null) {
  if (!value) return null;
  return value.trim();
}

export async function resolveOrganizationContext(): Promise<OrganizationContext> {
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

  const db = drizzleClientHttp;
  const conditions = [];
  if (email) conditions.push(eq(organizationUsers.email, email));
  if (wallet) conditions.push(eq(organizationUsers.walletAddress, wallet));

  const whereClause = conditions.length === 2 ? or(...conditions) : conditions[0]!;

  const match = await db
    .select({
      organizationId: organizations.id,
      accountState: organizations.accountState,
      primaryWallet: organizations.primaryWallet,
    })
    .from(organizationUsers)
    .innerJoin(organizations, eq(organizationUsers.organizationId, organizations.id))
    .where(whereClause)
    .limit(1)
    .then((rows) => rows.at(0));

  if (!match) {
    return { status: 'error', reason: 'organization-not-found' };
  }

  return {
    status: 'ok',
    organizationId: match.organizationId,
    accountState: match.accountState,
    primaryWallet: match.primaryWallet,
  };
}
