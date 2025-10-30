'use server';

import { revalidatePath } from 'next/cache';
import { cookies, headers } from 'next/headers';

import { eq } from 'drizzle-orm';
import { start } from 'workflow/api';
import { z } from 'zod';

import { drizzleClientHttp } from '@/db';
import { employmentTypeEnum, organizations } from '@/db/schema';
import { inviteEmployeeWorkflow, type InviteEmployeeWorkflowInput } from '@/workflows/employee-invite';

import { createActivityLog } from './activity-log';
import { resolveOrganizationContext } from './organization-context';

type ActionResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      reason?: string;
      error: string;
    };

const InviteEmployeeSchema = z.object({
  fullName: z.string().min(1, 'Employee name is required.'),
  email: z.string().email('Provide a valid email address.'),
  department: z.string().optional(),
  location: z.string().optional(),
  employmentType: z.enum(employmentTypeEnum.enumValues),
  hourlyRate: z
    .string()
    .optional()
    .transform((value) => {
      if (!value) return undefined;
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
    }),
  tags: z
    .string()
    .optional()
    .transform((value) =>
      value
        ? value
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [],
    ),
});

type InviteEmployeeResult = {
  inviteUrl: string;
  inviteToken: string;
  expiresAt: string;
};

function normalizeString(value?: string | null) {
  const next = value?.trim();
  return next && next.length > 0 ? next : null;
}

function resolveBaseUrl(hostHeader?: string | null, protoHeader?: string | null) {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }

  const host = hostHeader?.trim() || 'localhost:3000';
  const proto = protoHeader?.trim() || 'http';
  return `${proto}://${host}`.replace(/\/$/, '');
}

export async function inviteEmployee(input: unknown): Promise<ActionResult<InviteEmployeeResult>> {
  const parsed = InviteEmployeeSchema.safeParse(input);
  if (!parsed.success) {
    const message = parsed.error.issues.at(0)?.message ?? 'Some employee details are missing.';
    return { ok: false, error: message };
  }

  const context = await resolveOrganizationContext();
  if (context.status !== 'ok') {
    return {
      ok: false,
      reason: context.reason,
      error:
        context.reason === 'database-disabled'
          ? 'Employee invitations require the database to be configured.'
          : 'We could not determine your organization. Refresh and try again.',
    };
  }

  const db = drizzleClientHttp;
  const organization = await db
    .select({
      id: organizations.id,
      name: organizations.name,
    })
    .from(organizations)
    .where(eq(organizations.id, context.organizationId))
    .limit(1)
    .then((rows) => rows.at(0));

  if (!organization) {
    return {
      ok: false,
      error: 'Your organization could not be found. Try signing out and back in.',
    };
  }

  const cookieStore = await cookies();
  const headerStore = await headers();

  const inviterEmail = normalizeString(cookieStore.get('cascade-user-email')?.value);
  const inviterWallet =
    normalizeString(cookieStore.get('cascade-wallet')?.value) ?? normalizeString(headerStore.get('x-cascade-wallet'));

  const baseUrl = resolveBaseUrl(
    headerStore.get('x-forwarded-host') ?? headerStore.get('host'),
    headerStore.get('x-forwarded-proto'),
  );

  const payload: InviteEmployeeWorkflowInput = {
    organizationId: organization.id,
    organizationName: organization.name,
    inviterEmail,
    inviterWallet,
    employeeName: parsed.data.fullName,
    employeeEmail: parsed.data.email,
    department: normalizeString(parsed.data.department),
    location: normalizeString(parsed.data.location),
    employmentType: parsed.data.employmentType,
    hourlyRate: parsed.data.hourlyRate ?? null,
    tags: parsed.data.tags ?? [],
    baseUrl,
  };

  try {
    const run = await start(inviteEmployeeWorkflow, [payload]);
    const result = await run.returnValue;

    await createActivityLog({
      title: `Invited ${parsed.data.fullName}`,
      description: `An invitation email was sent to ${parsed.data.email}.`,
      activityType: 'stream_refresh_activity',
      metadata: {
        employeeId: result.employeeId,
        invitationId: result.invitationId,
        inviteToken: result.inviteToken,
        inviteUrl: result.inviteUrl,
      },
    });

    await Promise.all([
      revalidatePath('/dashboard'),
      revalidatePath('/dashboard/employees'),
      revalidatePath('/dashboard/employees/invitations'),
    ]);

    return {
      ok: true,
      data: {
        inviteUrl: result.inviteUrl,
        inviteToken: result.inviteToken,
        expiresAt: result.expiresAt instanceof Date ? result.expiresAt.toISOString() : String(result.expiresAt),
      },
    };
  } catch (error) {
    console.error('[employees] Failed to invite employee', error);
    const message =
      error instanceof Error
        ? error.message || 'We could not send the invitation. Please try again.'
        : 'We could not send the invitation. Please try again.';
    return { ok: false, error: message };
  }
}
