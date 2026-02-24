import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import * as Sentry from '@sentry/nextjs';
import { eq } from 'drizzle-orm';

import { drizzleClientHttp } from '@/core/db';
import { organizationUsers } from '@/core/db/schema';

const hasDatabase = Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0);

type IntentRole = 'employer' | 'employee';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const walletAddress =
    typeof (body as { walletAddress?: string } | null)?.walletAddress === 'string'
      ? (body as { walletAddress?: string }).walletAddress!.trim()
      : '';
  const intendedRole: IntentRole =
    (body as { intendedRole?: string } | null)?.intendedRole === 'employee' ? 'employee' : 'employer';
  const organizationIdRaw =
    typeof (body as { organizationId?: string } | null)?.organizationId === 'string'
      ? (body as { organizationId?: string }).organizationId
      : undefined;
  const organizationId = organizationIdRaw?.trim() ? organizationIdRaw.trim() : undefined;

  if (!walletAddress) {
    return NextResponse.json({ error: 'Missing wallet address.' }, { status: 400 });
  }

  let user:
    | {
        id: string;
        role: IntentRole;
        email: string;
        organizationId: string;
      }
    | undefined;
  let dbUnavailable = false;

  if (!hasDatabase) {
    dbUnavailable = false;
  }

  if (hasDatabase) {
    try {
      const records = await drizzleClientHttp
        .select({
          id: organizationUsers.id,
          role: organizationUsers.role,
          email: organizationUsers.email,
          organizationId: organizationUsers.organizationId,
        })
        .from(organizationUsers)
        .where(eq(organizationUsers.walletAddress, walletAddress));

      const exactMatch = organizationId
        ? records.find((record) => record.organizationId === organizationId)
        : undefined;
      const roleMatch = records.find((record) => record.role === intendedRole);
      user = exactMatch ?? roleMatch ?? records[0];

      Sentry.logger.info('Resolved user role', {
        role: user?.role,
        organizationId: user?.organizationId,
      });
    } catch (error) {
      dbUnavailable = true;
      Sentry.logger.error('Wallet role lookup failed', { error });
      console.error('[auth] Wallet role lookup failed', error);
    }
  }

  const cookieStore = await cookies();
  cookieStore.set({
    name: 'cascade-wallet',
    value: walletAddress,
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
  });

  if (user) {
    cookieStore.set({
      name: 'cascade-user-role',
      value: user.role,
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
    });

    cookieStore.set({
      name: 'cascade-user-email',
      value: user.email,
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
    });

    cookieStore.set({
      name: 'cascade-organization-id',
      value: user.organizationId,
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
    });

    return NextResponse.json({
      found: true,
      role: user.role,
      organizationId: user.organizationId,
      dbUnavailable,
    });
  }

  if (intendedRole === 'employer') {
    cookieStore.set({
      name: 'cascade-user-role',
      value: 'employer',
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
    });
  } else {
    cookieStore.delete('cascade-user-role');
  }

  cookieStore.delete('cascade-user-email');
  cookieStore.delete('cascade-organization-id');

  return NextResponse.json({
    found: false,
    role: intendedRole,
    organizationId: organizationId ?? null,
    dbUnavailable,
    reason: dbUnavailable ? 'db_unavailable' : 'not_found',
  });
}
