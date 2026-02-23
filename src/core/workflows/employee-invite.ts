import { and, eq } from 'drizzle-orm';
import { FatalError } from 'workflow';

import { drizzleClientHttp } from '@/core/db';
import { employeeInvitations, employees, organizationUsers, type employmentTypeEnum } from '@/core/db/schema';

const INVITE_TTL_DAYS = 14;

type EmploymentTypeEnum = (typeof employmentTypeEnum)['enumValues'][number];

export type InviteEmployeeWorkflowInput = {
  organizationId: string;
  organizationName?: string | null;
  inviterEmail?: string | null;
  inviterWallet?: string | null;
  employeeName: string;
  employeeEmail: string;
  department?: string | null;
  location?: string | null;
  employmentType?: EmploymentTypeEnum | null;
  primaryWallet?: string | null;
  backupWallet?: string | null;
  hourlyRate?: number | null;
  tags?: string[];
  baseUrl: string;
};

export type InviteEmployeeWorkflowResult = {
  invitationId: string;
  inviteToken: string;
  inviteUrl: string;
  employeeId: string;
  organizationUserId: string;
  expiresAt: Date;
};

function normalizeEmail(value?: string | null) {
  return value?.trim().toLowerCase() ?? null;
}

function normalizeString(value?: string | null) {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
}

function resolveEmploymentType(raw?: EmploymentTypeEnum | string | null): EmploymentTypeEnum {
  if (!raw) return 'full_time';

  const normalized = raw.trim().toLowerCase();
  switch (normalized) {
    case 'full-time':
    case 'full_time':
    case 'full time':
      return 'full_time';
    case 'part-time':
    case 'part_time':
    case 'part time':
      return 'part_time';
    case 'contractor':
    case 'contract':
      return 'contract';
    case 'temporary':
      return 'temporary';
    case 'intern':
    case 'internship':
      return 'intern';
    case 'other':
      return 'other';
    default:
      return 'full_time';
  }
}

function buildInviteUrl(baseUrl: string, token: string) {
  const trimmedBase = baseUrl.replace(/\/$/, '');
  return `${trimmedBase}/onboarding/employee/${token}`;
}

export async function inviteEmployeeWorkflow(
  input: InviteEmployeeWorkflowInput,
): Promise<InviteEmployeeWorkflowResult> {
  'use workflow';

  const normalizedEmail = normalizeEmail(input.employeeEmail);
  if (!normalizedEmail) {
    throw new FatalError('Invalid employee email address.');
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
  const employmentType = resolveEmploymentType(input.employmentType);

  const employee = await upsertEmployee({
    organizationId: input.organizationId,
    name: input.employeeName,
    email: normalizedEmail,
    department: normalizeString(input.department),
    location: normalizeString(input.location),
    employmentType,
    primaryWallet: normalizeString(input.primaryWallet),
    backupWallet: normalizeString(input.backupWallet),
    hourlyRate: input.hourlyRate ?? null,
    tags: input.tags ?? [],
    invitedAt: now,
    inviterEmail: input.inviterEmail,
    inviterWallet: input.inviterWallet,
  });

  const organizationUser = await upsertOrganizationUser({
    organizationId: input.organizationId,
    employeeId: employee.id,
    email: normalizedEmail,
    displayName: input.employeeName,
    walletAddress: normalizeString(input.primaryWallet),
    invitedAt: now,
    inviterEmail: input.inviterEmail,
    inviterWallet: input.inviterWallet,
  });

  await revokeExistingInvites({
    organizationId: input.organizationId,
    email: normalizedEmail,
  });

  const invitation = await createInvitation({
    organizationId: input.organizationId,
    employeeId: employee.id,
    email: normalizedEmail,
    expiresAt,
    inviterEmail: input.inviterEmail,
    inviterWallet: input.inviterWallet,
  });

  await dispatchInviteEmail({
    email: normalizedEmail,
    employeeName: input.employeeName,
    organizationName: input.organizationName,
    inviteUrl: buildInviteUrl(input.baseUrl, invitation.inviteToken),
    expiresAt,
  });

  return {
    invitationId: invitation.id,
    inviteToken: invitation.inviteToken,
    inviteUrl: buildInviteUrl(input.baseUrl, invitation.inviteToken),
    employeeId: employee.id,
    organizationUserId: organizationUser.id,
    expiresAt,
  };
}

type UpsertEmployeeInput = {
  organizationId: string;
  name: string;
  email: string;
  department: string | null;
  location: string | null;
  employmentType: EmploymentTypeEnum;
  primaryWallet: string | null;
  backupWallet: string | null;
  hourlyRate: number | null;
  tags: string[];
  invitedAt: Date;
  inviterEmail?: string | null;
  inviterWallet?: string | null;
};

async function upsertEmployee(input: UpsertEmployeeInput) {
  'use step';

  const db = drizzleClientHttp;
  const metadata = {
    department: input.department,
    location: input.location,
    invitedBy: input.inviterEmail,
    invitedByWallet: input.inviterWallet,
  };

  const hourlyRate = input.hourlyRate != null && Number.isFinite(input.hourlyRate) ? Number(input.hourlyRate) : null;

  const [record] = await db
    .insert(employees)
    .values({
      organizationId: input.organizationId,
      fullName: input.name,
      email: input.email,
      department: input.department ?? undefined,
      location: input.location ?? undefined,
      employmentType: input.employmentType,
      status: 'invited',
      primaryWallet: input.primaryWallet ?? undefined,
      backupWallet: input.backupWallet ?? undefined,
      hourlyRateReference: hourlyRate != null ? hourlyRate.toString() : undefined,
      tags: input.tags && input.tags.length > 0 ? input.tags : undefined,
      invitedAt: input.invitedAt,
      metadata,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [employees.organizationId, employees.email],
      set: {
        fullName: input.name,
        department: input.department ?? undefined,
        location: input.location ?? undefined,
        employmentType: input.employmentType,
        status: 'invited',
        primaryWallet: input.primaryWallet ?? undefined,
        backupWallet: input.backupWallet ?? undefined,
        hourlyRateReference: hourlyRate != null ? hourlyRate.toString() : undefined,
        tags: input.tags && input.tags.length > 0 ? input.tags : [],
        invitedAt: input.invitedAt,
        metadata,
        updatedAt: new Date(),
      },
    })
    .returning({
      id: employees.id,
    });

  if (!record) {
    throw new FatalError('Failed to upsert employee record.');
  }

  return record;
}

type UpsertOrganizationUserInput = {
  organizationId: string;
  employeeId: string;
  email: string;
  displayName: string;
  walletAddress: string | null;
  invitedAt: Date;
  inviterEmail?: string | null;
  inviterWallet?: string | null;
};

async function upsertOrganizationUser(input: UpsertOrganizationUserInput) {
  'use step';

  const db = drizzleClientHttp;

  // Check if this email already exists as an employer in this organization
  const [existingUser] = await db
    .select({
      id: organizationUsers.id,
      role: organizationUsers.role,
      email: organizationUsers.email,
    })
    .from(organizationUsers)
    .where(and(eq(organizationUsers.organizationId, input.organizationId), eq(organizationUsers.email, input.email)))
    .limit(1);

  if (existingUser && existingUser.role === 'employer') {
    throw new FatalError(
      `The email ${input.email} is already registered as an employer/admin in this organization. Employers cannot be invited as employees.`,
    );
  }

  const [record] = await db
    .insert(organizationUsers)
    .values({
      organizationId: input.organizationId,
      employeeId: input.employeeId,
      email: input.email,
      displayName: input.displayName,
      walletAddress: input.walletAddress ?? undefined,
      role: 'employee',
      invitedAt: input.invitedAt,
      metadata: {
        invitedBy: input.inviterEmail,
        invitedByWallet: input.inviterWallet,
      },
    })
    .onConflictDoUpdate({
      target: [organizationUsers.organizationId, organizationUsers.email],
      set: {
        employeeId: input.employeeId,
        displayName: input.displayName,
        walletAddress: input.walletAddress ?? undefined,
        role: 'employee',
        invitedAt: input.invitedAt,
        metadata: {
          invitedBy: input.inviterEmail,
          invitedByWallet: input.inviterWallet,
        },
        updatedAt: new Date(),
      },
    })
    .returning({
      id: organizationUsers.id,
    });

  if (!record) {
    throw new FatalError('Failed to upsert organization user record.');
  }

  return record;
}

async function revokeExistingInvites({ organizationId, email }: { organizationId: string; email: string }) {
  'use step';

  await drizzleClientHttp
    .update(employeeInvitations)
    .set({
      status: 'revoked',
      revokedAt: new Date(),
    })
    .where(
      and(
        eq(employeeInvitations.organizationId, organizationId),
        eq(employeeInvitations.email, email),
        eq(employeeInvitations.status, 'sent'),
      ),
    );
}

type CreateInvitationInput = {
  organizationId: string;
  employeeId: string;
  email: string;
  expiresAt: Date;
  inviterEmail?: string | null;
  inviterWallet?: string | null;
};

async function createInvitation(input: CreateInvitationInput) {
  'use step';

  const db = drizzleClientHttp;
  const [record] = await db
    .insert(employeeInvitations)
    .values({
      organizationId: input.organizationId,
      employeeId: input.employeeId,
      email: input.email,
      status: 'sent',
      expiresAt: input.expiresAt,
      metadata: {
        invitedBy: input.inviterEmail,
        invitedByWallet: input.inviterWallet,
      },
      sentAt: new Date(),
    })
    .returning({
      id: employeeInvitations.id,
      inviteToken: employeeInvitations.inviteToken,
    });

  if (!record) {
    throw new FatalError('Failed to create employee invitation.');
  }

  return record;
}

type DispatchInviteEmailInput = {
  email: string;
  employeeName: string;
  organizationName?: string | null;
  inviteUrl: string;
  expiresAt: Date;
};

async function dispatchInviteEmail(input: DispatchInviteEmailInput) {
  'use step';

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.info(
      '[employee-invite] RESEND_API_KEY missing; skipping email delivery for %s. Invite link: %s',
      input.email,
      input.inviteUrl,
    );
    return;
  }

  const { Resend } = await import('resend');
  const { EmployeeInviteEmailTemplate } = await import('@/core/email/employee-invite-email');
  const resend = new Resend(apiKey);

  try {
    const response = await resend.emails.send({
      from: 'Cascade Invitations <onboarding@cascade.sattwyk.com>',
      to: input.email,
      subject: `${input.organizationName ?? 'Your employer'} invited you to Cascade`,
      react: EmployeeInviteEmailTemplate({
        employeeName: input.employeeName,
        organizationName: input.organizationName ?? 'Your employer',
        inviteUrl: input.inviteUrl,
        expiresAt: input.expiresAt,
      }),
    });

    if (response.error) {
      throw response.error;
    }

    console.info('[employee-invite] Sent invitation email to %s (%s)', input.email, response.data?.id);
  } catch (error) {
    console.error('[employee-invite] Failed to send invitation email', error);
    throw error;
  }
}
