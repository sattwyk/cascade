import { cookies, headers } from 'next/headers';

import { eq, or } from 'drizzle-orm';

import { drizzleClientHttp } from '@/db';
import { organizationUsers } from '@/db/schema';

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

    const email =
      normalizeEmail(cookieStore.get('cascade-user-email')?.value) ??
      normalizeEmail(headerStore.get('x-cascade-user-email'));

    const wallet =
      normalizeWallet(cookieStore.get('cascade-wallet')?.value) ?? normalizeWallet(headerStore.get('x-cascade-wallet'));

    if (hasDatabase && (email || wallet)) {
      const db = drizzleClientHttp;
      const conditions = [];
      if (email) {
        conditions.push(eq(organizationUsers.email, email));
      }
      if (wallet) {
        conditions.push(eq(organizationUsers.walletAddress, wallet));
      }

      const matchingUsers = await db
        .select({
          role: organizationUsers.role,
          isPrimary: organizationUsers.isPrimary,
        })
        .from(organizationUsers)
        .where(conditions.length === 2 ? or(...conditions) : conditions[0]!)
        .limit(10);

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
    console.error('[auth] Failed to resolve user role', error);
  }

  return 'employer';
}
