import { cookies, headers } from 'next/headers';
import { unstable_rethrow } from 'next/navigation';

import { eq } from 'drizzle-orm';

import { drizzleClientHttp } from '@/core/db';
import { organizationUsers } from '@/core/db/schema';

export type UserRole = 'employer' | 'employee';

function normalizeEmail(value?: string | null) {
  if (!value) return null;
  return value.trim().toLowerCase();
}

function normalizeWallet(value?: string | null) {
  if (!value) return null;
  return value.trim();
}

const hasDatabase = Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0);

export async function getUserRole(): Promise<UserRole> {
  try {
    const cookieStore = await cookies();
    const headerStore = await headers();

    const roleCookie = cookieStore.get('cascade-user-role')?.value as UserRole | undefined;
    const organizationId = normalizeWallet(cookieStore.get('cascade-organization-id')?.value);

    const email =
      normalizeEmail(cookieStore.get('cascade-user-email')?.value) ??
      normalizeEmail(headerStore.get('x-cascade-user-email'));

    const wallet =
      normalizeWallet(cookieStore.get('cascade-wallet')?.value) ?? normalizeWallet(headerStore.get('x-cascade-wallet'));

    if (hasDatabase && wallet) {
      const db = drizzleClientHttp;
      const matchingUsers = await db
        .select({
          role: organizationUsers.role,
          isPrimary: organizationUsers.isPrimary,
          organizationId: organizationUsers.organizationId,
        })
        .from(organizationUsers)
        .where(eq(organizationUsers.walletAddress, wallet))
        .limit(10);

      const organizationMatch = organizationId
        ? matchingUsers.find((entry) => entry.organizationId === organizationId)
        : undefined;
      if (organizationMatch) {
        return organizationMatch.role;
      }

      const cookieMatch = roleCookie ? matchingUsers.find((entry) => entry.role === roleCookie) : undefined;
      if (cookieMatch) {
        return cookieMatch.role;
      }

      const prioritized =
        matchingUsers.find((entry) => entry.role === 'employer' && entry.isPrimary) ??
        matchingUsers.find((entry) => entry.role === 'employer') ??
        matchingUsers.find((entry) => entry.role === 'employee');

      if (prioritized) {
        return prioritized.role;
      }
    }

    if (hasDatabase && email) {
      const db = drizzleClientHttp;
      const matchingUsers = await db
        .select({
          role: organizationUsers.role,
          isPrimary: organizationUsers.isPrimary,
          organizationId: organizationUsers.organizationId,
        })
        .from(organizationUsers)
        .where(eq(organizationUsers.email, email))
        .limit(10);

      const organizationMatch = organizationId
        ? matchingUsers.find((entry) => entry.organizationId === organizationId)
        : undefined;
      if (organizationMatch) {
        return organizationMatch.role;
      }

      const cookieMatch = roleCookie ? matchingUsers.find((entry) => entry.role === roleCookie) : undefined;
      if (cookieMatch) {
        return cookieMatch.role;
      }

      const prioritized =
        matchingUsers.find((entry) => entry.role === 'employer' && entry.isPrimary) ??
        matchingUsers.find((entry) => entry.role === 'employer') ??
        matchingUsers.find((entry) => entry.role === 'employee');

      if (prioritized) {
        return prioritized.role;
      }
    }

    if (roleCookie === 'employee' || roleCookie === 'employer') {
      return roleCookie;
    }
  } catch (error) {
    unstable_rethrow(error);
    console.error('[auth] Failed to resolve user role', error);
  }

  return 'employer';
}
