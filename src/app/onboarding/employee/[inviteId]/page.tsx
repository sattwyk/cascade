import Link from 'next/link';

import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { drizzleClientHttp } from '@/core/db';
import { employeeInvitations, employees, organizations } from '@/core/db/schema';
import { EmployeeOnboardingForm } from '@/features/onboarding/components/employee-onboarding-form';

type EmployeeOnboardingPageProps = {
  params: Promise<{ inviteId: string }>;
};

type InviteUnavailableReason = 'missing' | 'invalid' | 'expired' | 'revoked' | 'accepted' | 'disabled-db';

type InviteLoadResult =
  | {
      status: 'ready';
      invite: {
        inviteToken: string;
        employeeName: string | null;
        employeeEmail: string | null;
        organizationName: string | null;
        expiresAt: string | null;
      };
    }
  | {
      status: 'unavailable';
      reason: InviteUnavailableReason;
    };

const hasDatabase = Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0);

async function loadInvite(inviteToken: string): Promise<InviteLoadResult> {
  if (!hasDatabase) {
    return { status: 'unavailable', reason: 'disabled-db' };
  }

  const parsed = z.string().uuid().safeParse(inviteToken);
  if (!parsed.success) {
    return { status: 'unavailable', reason: 'invalid' };
  }

  const record = await drizzleClientHttp
    .select({
      inviteToken: employeeInvitations.inviteToken,
      status: employeeInvitations.status,
      expiresAt: employeeInvitations.expiresAt,
      employeeName: employees.fullName,
      employeeEmail: employeeInvitations.email,
      organizationName: organizations.name,
    })
    .from(employeeInvitations)
    .innerJoin(employees, eq(employeeInvitations.employeeId, employees.id))
    .innerJoin(organizations, eq(employeeInvitations.organizationId, organizations.id))
    .where(eq(employeeInvitations.inviteToken, parsed.data))
    .limit(1)
    .then((rows) => rows.at(0));

  if (!record) {
    return { status: 'unavailable', reason: 'missing' };
  }

  if (record.status === 'accepted') {
    return { status: 'unavailable', reason: 'accepted' };
  }

  if (record.status === 'revoked') {
    return { status: 'unavailable', reason: 'revoked' };
  }

  if (record.status !== 'sent') {
    return { status: 'unavailable', reason: 'missing' };
  }

  if (record.expiresAt && record.expiresAt.getTime() < Date.now()) {
    return { status: 'unavailable', reason: 'expired' };
  }

  return {
    status: 'ready',
    invite: {
      inviteToken: record.inviteToken,
      employeeName: record.employeeName,
      employeeEmail: record.employeeEmail,
      organizationName: record.organizationName,
      expiresAt: record.expiresAt?.toISOString() ?? null,
    },
  };
}

const reasonCopy: Record<InviteUnavailableReason, { title: string; body: string }> = {
  'disabled-db': {
    title: 'Invitations unavailable',
    body: 'Employee onboarding requires the database to be configured. Ask your employer to check the deployment.',
  },
  invalid: {
    title: 'Invalid invitation link',
    body: 'The invitation you followed is malformed. Double-check the URL from your email and try again.',
  },
  missing: {
    title: 'Invitation not found',
    body: 'We could not find an invitation with this code. Ask your employer to resend it.',
  },
  expired: {
    title: 'This invitation has expired',
    body: 'Invitations only last for a short time. Ask your employer to send a fresh link.',
  },
  revoked: {
    title: 'Invitation revoked',
    body: 'Your employer revoked this invitation. Reach out to them if you believe this is a mistake.',
  },
  accepted: {
    title: 'Invitation already used',
    body: 'This invitation link was already redeemed. Sign in with your wallet, or ask your employer for a new invite.',
  },
};

function InviteUnavailable({ inviteId, reason }: { inviteId: string; reason: InviteUnavailableReason }) {
  const copy = reasonCopy[reason];
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-2xl flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{copy.title}</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Invitation code <span className="font-mono text-foreground">{inviteId}</span> is unavailable. {copy.body}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href="mailto:support@cascade.sattwyk.com" className="text-sm font-medium text-primary hover:underline">
          Email support
        </Link>
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          Return to homepage
        </Link>
      </div>
    </div>
  );
}

export default async function EmployeeOnboardingPage({ params }: EmployeeOnboardingPageProps) {
  const { inviteId } = await params;
  const result = await loadInvite(inviteId);
  if (result.status !== 'ready') {
    return <InviteUnavailable inviteId={inviteId} reason={result.reason} />;
  }

  return <EmployeeOnboardingForm invite={result.invite} />;
}
