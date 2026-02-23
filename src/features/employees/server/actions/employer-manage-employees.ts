'use server';

import { revalidatePath } from 'next/cache';
import { cookies, headers } from 'next/headers';

import * as Sentry from '@sentry/nextjs';
import { and, eq } from 'drizzle-orm';
import { start } from 'workflow/api';
import { z } from 'zod';

import { drizzleClientHttp } from '@/core/db';
import { employees, employmentTypeEnum, organizations } from '@/core/db/schema';
import { inviteEmployeeWorkflow, type InviteEmployeeWorkflowInput } from '@/core/workflows/employee-invite';
import { createActivityLog } from '@/features/organization/server/actions/activity-log';
import { resolveOrganizationContext } from '@/features/organization/server/actions/organization-context';

import { getEmployeesForDashboard, type DashboardEmployee } from '../queries/employer-list-employees';

export type ActionResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      reason?: string;
      error: string;
    };

export async function listDashboardEmployees(): Promise<ActionResult<DashboardEmployee[]>> {
  try {
    const employees = await getEmployeesForDashboard();
    return { ok: true, data: employees };
  } catch (error) {
    Sentry.logger.error('Failed to load dashboard employees', { error });
    console.error('[employees] Failed to load dashboard employees', error);
    const message =
      error instanceof Error && error.message ? error.message : 'We could not load your employees. Please try again.';
    return { ok: false, error: message };
  }
}

export async function updateDashboardEmployee(
  input: unknown,
): Promise<ActionResult<{ employeeId: string; changes?: Record<string, { from: unknown; to: unknown }> }>> {
  const parsed = UpdateEmployeeSchema.safeParse(input);
  if (!parsed.success) {
    const message = parsed.error.issues.at(0)?.message ?? 'Some employee details are missing.';
    return { ok: false, error: message };
  }

  if (parsed.data.hourlyRate != null && !Number.isFinite(parsed.data.hourlyRate)) {
    return { ok: false, error: 'Hourly rate must be a valid number.' };
  }

  const context = await resolveOrganizationContext();
  if (context.status !== 'ok') {
    return {
      ok: false,
      reason: context.reason,
      error:
        context.reason === 'database-disabled'
          ? 'Employee updates require the database to be configured.'
          : 'We could not determine your organization. Refresh and try again.',
    };
  }

  const normalizedName = parsed.data.fullName.trim();
  const normalizedEmail = normalizeString(parsed.data.email);
  const normalizedDepartment = normalizeString(parsed.data.department);
  const normalizedLocation = normalizeString(parsed.data.location);
  const normalizedPrimaryWallet = normalizeString(parsed.data.primaryWallet);
  const normalizedHourlyRate = parsed.data.hourlyRate;
  const normalizedHourlyRateValue = normalizedHourlyRate != null ? normalizedHourlyRate.toString() : null;
  const normalizedTags = normalizeTags(parsed.data.tags);

  const existing = await drizzleClientHttp
    .select({
      id: employees.id,
      fullName: employees.fullName,
      email: employees.email,
      department: employees.department,
      location: employees.location,
      employmentType: employees.employmentType,
      primaryWallet: employees.primaryWallet,
      hourlyRateReference: employees.hourlyRateReference,
      tags: employees.tags,
    })
    .from(employees)
    .where(and(eq(employees.id, parsed.data.employeeId), eq(employees.organizationId, context.organizationId)))
    .limit(1)
    .then((rows) => rows.at(0));

  if (!existing) {
    return { ok: false, error: 'Employee not found.' };
  }

  await drizzleClientHttp
    .update(employees)
    .set({
      fullName: normalizedName,
      email: normalizedEmail,
      department: normalizedDepartment,
      location: normalizedLocation,
      employmentType: parsed.data.employmentType,
      primaryWallet: normalizedPrimaryWallet,
      hourlyRateReference: normalizedHourlyRateValue,
      tags: normalizedTags,
      updatedAt: new Date(),
    })
    .where(and(eq(employees.id, parsed.data.employeeId), eq(employees.organizationId, context.organizationId)));

  const before = {
    name: existing.fullName.trim(),
    email: normalizeString(existing.email),
    department: normalizeString(existing.department),
    location: normalizeString(existing.location),
    employmentType: existing.employmentType,
    primaryWallet: normalizeString(existing.primaryWallet),
    hourlyRate: toNumber(existing.hourlyRateReference),
    tags: normalizeTags(existing.tags),
  };

  const after = {
    name: normalizedName,
    email: normalizedEmail,
    department: normalizedDepartment,
    location: normalizedLocation,
    employmentType: parsed.data.employmentType,
    primaryWallet: normalizedPrimaryWallet,
    hourlyRate: normalizedHourlyRate,
    tags: normalizedTags,
  };

  const changes: Record<string, { from: unknown; to: unknown }> = {};
  const recordChange = (key: keyof typeof before) => {
    const fromValue = before[key];
    const toValue = after[key];
    if (Array.isArray(fromValue) && Array.isArray(toValue)) {
      if (!areStringArraysEqual(fromValue, toValue)) {
        changes[key] = { from: fromValue, to: toValue };
      }
      return;
    }
    if (fromValue !== toValue) {
      changes[key] = { from: fromValue, to: toValue };
    }
  };

  (Object.keys(before) as Array<keyof typeof before>).forEach(recordChange);

  const changeLabels: Record<string, string> = {
    name: 'name',
    email: 'email',
    department: 'department',
    location: 'location',
    employmentType: 'employment type',
    primaryWallet: 'primary wallet',
    hourlyRate: 'hourly rate',
    tags: 'tags',
  };
  const changeList = Object.keys(changes)
    .map((key) => changeLabels[key] ?? key)
    .join(', ');

  try {
    await createActivityLog({
      title: `Updated ${normalizedName}`,
      description: changeList ? `Updated ${changeList}.` : 'Updated employee details.',
      activityType: 'stream_refresh_activity',
      employeeId: existing.id,
      metadata: {
        changes,
      },
    });
  } catch (error) {
    Sentry.logger.error('Failed to log employee update', {
      error,
      employeeId: existing.id,
      changedFields: Object.keys(changes),
    });
    console.error('[employees] Failed to log employee update', error);
  }

  await Promise.all([
    revalidatePath('/dashboard'),
    revalidatePath('/dashboard/employees'),
    revalidatePath('/dashboard/employees/invitations'),
    revalidatePath('/dashboard/employees/archived'),
    revalidatePath('/dashboard/activity'),
  ]);

  return { ok: true, data: { employeeId: existing.id, changes } };
}

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

const UpdateEmployeeSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required.'),
  fullName: z.string().min(1, 'Employee name is required.'),
  email: z.string().email('Provide a valid email address.').nullable(),
  department: z.string().nullable(),
  location: z.string().nullable(),
  employmentType: z.enum(employmentTypeEnum.enumValues),
  primaryWallet: z.string().nullable(),
  hourlyRate: z.number().nonnegative().nullable(),
  tags: z.array(z.string()).default([]),
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

function normalizeTags(value?: string[] | null) {
  if (!Array.isArray(value)) return [];
  const trimmed = value.map((tag) => tag.trim()).filter(Boolean);
  return Array.from(new Set(trimmed));
}

function toNumber(value: unknown): number | null {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function areStringArraysEqual(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
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

    Sentry.logger.info('Employee invited successfully', {
      employeeId: result.employeeId,
      organizationId: context.organizationId,
    });

    return {
      ok: true,
      data: {
        inviteUrl: result.inviteUrl,
        inviteToken: result.inviteToken,
        expiresAt: result.expiresAt instanceof Date ? result.expiresAt.toISOString() : String(result.expiresAt),
      },
    };
  } catch (error) {
    Sentry.logger.error('Failed to invite employee', { error, organizationId: context.organizationId });
    console.error('[employees] Failed to invite employee', error);
    const message =
      error instanceof Error
        ? error.message || 'We could not send the invitation. Please try again.'
        : 'We could not send the invitation. Please try again.';
    return { ok: false, error: message };
  }
}
