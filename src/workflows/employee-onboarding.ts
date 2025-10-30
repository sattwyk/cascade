import { and, eq } from 'drizzle-orm';
import { FatalError } from 'workflow';

import { drizzleClientHttp } from '@/db';
import {
  employeeInvitations,
  employees,
  employeeStatusHistory,
  organizationActivity,
  organizations,
  organizationUsers,
  type employeeStateEnum,
} from '@/db/schema';

export type CompleteEmployeeOnboardingInput = {
  inviteToken: string;
  displayName?: string | null;
  walletAddress: string;
  backupWallet?: string | null;
  acceptPolicies: boolean;
};

export type CompleteEmployeeOnboardingResult = {
  organizationId: string;
  organizationUserId: string;
  employeeId: string;
  employeeEmail: string;
  organizationName: string | null;
};

type InvitationRecord = {
  invitationId: string;
  organizationId: string;
  organizationName: string | null;
  employeeId: string;
  employeeEmail: string;
  employeeName: string | null;
  employeeStatus: (typeof employeeStateEnum)['enumValues'][number];
  employeeMetadata: Record<string, unknown> | null;
  organizationUserId: string | null;
  organizationUserMetadata: Record<string, unknown> | null;
  status: 'draft' | 'sent' | 'accepted' | 'revoked' | 'expired';
  expiresAt: Date | null;
  invitationMetadata: Record<string, unknown> | null;
};

function normalizeWallet(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

export async function completeEmployeeOnboardingWorkflow(
  input: CompleteEmployeeOnboardingInput,
): Promise<CompleteEmployeeOnboardingResult> {
  'use workflow';

  if (!input.walletAddress || input.walletAddress.trim().length === 0) {
    throw new FatalError('A wallet address is required to activate your account.');
  }
  if (!input.acceptPolicies) {
    throw new FatalError('You must acknowledge the policies before continuing.');
  }

  const invitation = await loadActiveInvitation(input.inviteToken);
  const now = new Date();

  await updateEmployeeRecord({
    employeeId: invitation.employeeId,
    walletAddress: input.walletAddress,
    backupWallet: normalizeWallet(input.backupWallet),
    displayName: input.displayName ?? invitation.employeeName ?? undefined,
    previousStatus: invitation.employeeStatus,
    previousMetadata: invitation.employeeMetadata ?? {},
    occurredAt: now,
  });

  const organizationUser = await updateOrganizationUser({
    organizationId: invitation.organizationId,
    employeeId: invitation.employeeId,
    email: invitation.employeeEmail,
    walletAddress: input.walletAddress,
    displayName: input.displayName ?? invitation.employeeName ?? undefined,
    previousMetadata: invitation.organizationUserMetadata ?? {},
    occurredAt: now,
  });

  await recordStatusHistory({
    employeeId: invitation.employeeId,
    organizationId: invitation.organizationId,
    fromStatus: invitation.employeeStatus,
    toStatus: 'ready',
    actorWallet: input.walletAddress,
    occurredAt: now,
  });

  await markInvitationAccepted({
    invitationId: invitation.invitationId,
    acceptPolicies: input.acceptPolicies,
    occurredAt: now,
    walletAddress: input.walletAddress,
  });

  await logActivity({
    organizationId: invitation.organizationId,
    employeeId: invitation.employeeId,
    walletAddress: input.walletAddress,
    inviteToken: input.inviteToken,
    occurredAt: now,
  });

  return {
    organizationId: invitation.organizationId,
    organizationUserId: organizationUser.organizationUserId,
    employeeId: invitation.employeeId,
    employeeEmail: invitation.employeeEmail,
    organizationName: invitation.organizationName,
  };
}

async function loadActiveInvitation(inviteToken: string): Promise<InvitationRecord> {
  'use step';

  const db = drizzleClientHttp;
  const result = await db
    .select({
      invitationId: employeeInvitations.id,
      organizationId: employeeInvitations.organizationId,
      organizationName: organizations.name,
      employeeId: employeeInvitations.employeeId,
      employeeEmail: employeeInvitations.email,
      employeeName: employees.fullName,
      employeeStatus: employees.status,
      employeeMetadata: employees.metadata,
      organizationUserId: organizationUsers.id,
      organizationUserMetadata: organizationUsers.metadata,
      status: employeeInvitations.status,
      expiresAt: employeeInvitations.expiresAt,
      invitationMetadata: employeeInvitations.metadata,
    })
    .from(employeeInvitations)
    .innerJoin(employees, eq(employeeInvitations.employeeId, employees.id))
    .innerJoin(
      organizationUsers,
      and(
        eq(organizationUsers.organizationId, employeeInvitations.organizationId),
        eq(organizationUsers.email, employeeInvitations.email),
      ),
    )
    .innerJoin(organizations, eq(employeeInvitations.organizationId, organizations.id))
    .where(eq(employeeInvitations.inviteToken, inviteToken))
    .limit(1)
    .then((rows) => rows.at(0));

  if (!result) {
    throw new FatalError('This invitation could not be found.');
  }

  if (result.status !== 'sent') {
    throw new FatalError('This invitation has already been used or revoked.');
  }

  if (result.expiresAt && result.expiresAt.getTime() < Date.now()) {
    await drizzleClientHttp
      .update(employeeInvitations)
      .set({
        status: 'expired',
      })
      .where(eq(employeeInvitations.id, result.invitationId));
    throw new FatalError('This invitation has expired. Ask your employer to send a new one.');
  }

  const organizationName =
    result.organizationName ??
    (typeof result.employeeMetadata?.['organizationName'] === 'string'
      ? (result.employeeMetadata['organizationName'] as string)
      : null);

  return {
    invitationId: result.invitationId,
    organizationId: result.organizationId,
    organizationName: organizationName ?? null,
    employeeId: result.employeeId,
    employeeEmail: result.employeeEmail,
    employeeName: result.employeeName,
    employeeStatus: result.employeeStatus,
    employeeMetadata: (result.employeeMetadata ?? {}) as Record<string, unknown>,
    organizationUserId: result.organizationUserId,
    organizationUserMetadata: (result.organizationUserMetadata ?? {}) as Record<string, unknown>,
    status: result.status,
    expiresAt: result.expiresAt,
    invitationMetadata: (result.invitationMetadata ?? {}) as Record<string, unknown>,
  };
}

type UpdateEmployeeRecordInput = {
  employeeId: string;
  walletAddress: string;
  backupWallet?: string | null;
  displayName?: string;
  previousStatus: (typeof employeeStateEnum)['enumValues'][number];
  previousMetadata: Record<string, unknown>;
  occurredAt: Date;
};

async function updateEmployeeRecord(input: UpdateEmployeeRecordInput) {
  'use step';

  const metadata = {
    ...input.previousMetadata,
    onboardingCompletedAt: input.occurredAt.toISOString(),
  };

  const [record] = await drizzleClientHttp
    .update(employees)
    .set({
      status: 'ready',
      primaryWallet: input.walletAddress,
      backupWallet: input.backupWallet ?? undefined,
      metadata,
      updatedAt: input.occurredAt,
    })
    .where(eq(employees.id, input.employeeId))
    .returning({
      employeeId: employees.id,
    });

  if (!record) {
    throw new FatalError('Unable to update the employee record.');
  }

  return record;
}

type UpdateOrganizationUserInput = {
  organizationId: string;
  employeeId: string;
  email: string;
  walletAddress: string;
  displayName?: string;
  previousMetadata: Record<string, unknown>;
  occurredAt: Date;
};

async function updateOrganizationUser(input: UpdateOrganizationUserInput) {
  'use step';

  const metadata = {
    ...input.previousMetadata,
    onboardingCompletedAt: input.occurredAt.toISOString(),
  };

  const [record] = await drizzleClientHttp
    .update(organizationUsers)
    .set({
      employeeId: input.employeeId,
      displayName: input.displayName ?? input.email,
      walletAddress: input.walletAddress,
      role: 'employee',
      joinedAt: input.occurredAt,
      metadata,
      updatedAt: input.occurredAt,
    })
    .where(and(eq(organizationUsers.organizationId, input.organizationId), eq(organizationUsers.email, input.email)))
    .returning({
      organizationUserId: organizationUsers.id,
    });

  if (!record) {
    throw new FatalError('Unable to update the employee profile.');
  }

  return record;
}

type RecordStatusHistoryInput = {
  employeeId: string;
  organizationId: string;
  fromStatus: (typeof employeeStateEnum)['enumValues'][number];
  toStatus: (typeof employeeStateEnum)['enumValues'][number];
  actorWallet: string;
  occurredAt: Date;
};

async function recordStatusHistory(input: RecordStatusHistoryInput) {
  'use step';

  await drizzleClientHttp.insert(employeeStatusHistory).values({
    employeeId: input.employeeId,
    organizationId: input.organizationId,
    fromStatus: input.fromStatus,
    toStatus: input.toStatus,
    changedByWallet: input.actorWallet,
    createdAt: input.occurredAt,
  });
}

type MarkInvitationAcceptedInput = {
  invitationId: string;
  acceptPolicies: boolean;
  walletAddress: string;
  occurredAt: Date;
};

async function markInvitationAccepted(input: MarkInvitationAcceptedInput) {
  'use step';

  const { invitationId, acceptPolicies, walletAddress, occurredAt } = input;

  const existing = await drizzleClientHttp
    .select({
      metadata: employeeInvitations.metadata,
    })
    .from(employeeInvitations)
    .where(eq(employeeInvitations.id, invitationId))
    .limit(1)
    .then((rows) => rows.at(0)?.metadata as Record<string, unknown> | undefined);

  await drizzleClientHttp
    .update(employeeInvitations)
    .set({
      status: 'accepted',
      acceptedAt: occurredAt,
      metadata: {
        ...(existing ?? {}),
        acceptedPolicies: acceptPolicies,
        acceptedWallet: walletAddress,
      },
    })
    .where(eq(employeeInvitations.id, invitationId));
}

type LogActivityInput = {
  organizationId: string;
  employeeId: string;
  walletAddress: string;
  inviteToken: string;
  occurredAt: Date;
};

async function logActivity(input: LogActivityInput) {
  'use step';

  await drizzleClientHttp.insert(organizationActivity).values({
    organizationId: input.organizationId,
    employeeId: input.employeeId,
    actorType: 'employee',
    actorAddress: input.walletAddress,
    activityType: 'stream_refresh_activity',
    title: 'Employee accepted invitation',
    description: 'An employee joined Cascade using their invitation link.',
    occurredAt: input.occurredAt,
    metadata: {
      inviteToken: input.inviteToken,
    },
  });
}
