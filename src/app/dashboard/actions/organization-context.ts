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

  // Also check for persisted organization ID from localStorage
  const persistedOrgId = normalizeWallet(cookieStore.get('cascade-organization-id')?.value);

  if (!email && !wallet) {
    return { status: 'error', reason: 'identity-required' };
  }

  const db = drizzleClientHttp;

  // Strategy 1: Exact match on wallet + email + organizationId (most specific)
  if (wallet && email && persistedOrgId) {
    const exactMatch = await db
      .select({
        organizationId: organizations.id,
        accountState: organizations.accountState,
        primaryWallet: organizations.primaryWallet,
      })
      .from(organizationUsers)
      .innerJoin(organizations, eq(organizationUsers.organizationId, organizations.id))
      .where(or(eq(organizationUsers.walletAddress, wallet), eq(organizationUsers.email, email)))
      .then((rows) => rows.find((row) => row.organizationId === persistedOrgId));

    if (exactMatch) {
      return {
        status: 'ok',
        organizationId: exactMatch.organizationId,
        accountState: exactMatch.accountState,
        primaryWallet: exactMatch.primaryWallet,
      };
    }
  }

  // Strategy 2: Match by wallet only (wallets are more reliable than emails)
  if (wallet) {
    const walletMatch = await db
      .select({
        organizationId: organizations.id,
        accountState: organizations.accountState,
        primaryWallet: organizations.primaryWallet,
      })
      .from(organizationUsers)
      .innerJoin(organizations, eq(organizationUsers.organizationId, organizations.id))
      .where(eq(organizationUsers.walletAddress, wallet))
      .limit(1)
      .then((rows) => rows.at(0));

    if (walletMatch) {
      return {
        status: 'ok',
        organizationId: walletMatch.organizationId,
        accountState: walletMatch.accountState,
        primaryWallet: walletMatch.primaryWallet,
      };
    }
  }

  // Strategy 3: Fallback to email only (least reliable - user may be in multiple orgs)
  if (email) {
    const emailMatch = await db
      .select({
        organizationId: organizations.id,
        accountState: organizations.accountState,
        primaryWallet: organizations.primaryWallet,
      })
      .from(organizationUsers)
      .innerJoin(organizations, eq(organizationUsers.organizationId, organizations.id))
      .where(eq(organizationUsers.email, email))
      .limit(1)
      .then((rows) => rows.at(0));

    if (emailMatch) {
      return {
        status: 'ok',
        organizationId: emailMatch.organizationId,
        accountState: emailMatch.accountState,
        primaryWallet: emailMatch.primaryWallet,
      };
    }
  }

  return { status: 'error', reason: 'organization-not-found' };
}
