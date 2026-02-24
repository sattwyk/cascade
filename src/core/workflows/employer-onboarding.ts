import { and, eq } from 'drizzle-orm';
import { FatalError } from 'workflow';

import { drizzleClientHttp } from '@/core/db';
import { onboardingEmailVerifications, organizations, organizationUsers, organizationWallets } from '@/core/db/schema';

const OTP_TTL_MINUTES = 10;
const MAX_VERIFICATION_ATTEMPTS = 5;

export type SendVerificationInput = {
  email: string;
  organizationName?: string;
};

export type VerifyVerificationInput = {
  email: string;
  sessionId: string;
  code: string;
};

export type CompleteOnboardingInput = {
  organizationName: string;
  organizationMail: string;
  verificationSessionId: string;
  timezone: string;
  selectedMint: 'USDC' | 'USDT' | 'EURC';
  fundingAcknowledged: true;
  emergencyAcknowledged: true;
  confirmedWalletAddress: string;
};

type VerificationRecord = {
  id: string;
  email: string;
  organizationName?: string | null;
  code: string;
  expiresAt: Date;
};

export async function sendVerificationCodeWorkflow(input: SendVerificationInput) {
  'use workflow';

  const verification = await issueVerificationCode(input);
  await dispatchVerificationEmail({
    email: verification.email,
    organizationName: verification.organizationName ?? undefined,
    code: verification.code,
  });

  return {
    sessionId: verification.id,
    expiresAt: verification.expiresAt,
  };
}

export async function verifyOnboardingCodeWorkflow(input: VerifyVerificationInput) {
  'use workflow';

  const result = await verifyCode(input);
  return {
    sessionId: result.id,
    verifiedAt: result.verifiedAt,
  };
}

export async function employerOnboardingWorkflow(input: CompleteOnboardingInput) {
  'use workflow';

  const verification = await ensureVerifiedEmail({
    email: input.organizationMail,
    sessionId: input.verificationSessionId,
  });

  const organization = await createOrganization({
    name: input.organizationName,
    email: verification.email,
    timezone: input.timezone,
    defaultMint: input.selectedMint,
    primaryWallet: input.confirmedWalletAddress,
    fundingAcknowledged: input.fundingAcknowledged,
    emergencyAcknowledged: input.emergencyAcknowledged,
  });

  const adminUser = await registerOrganizationAdmin({
    organizationId: organization.id,
    contactEmail: verification.email,
    organizationName: organization.name,
    walletAddress: input.confirmedWalletAddress,
  });

  await markVerificationClaimed({
    sessionId: verification.id,
    organizationId: organization.id,
  });

  return {
    organizationId: organization.id,
    organizationUserId: adminUser.id,
    role: adminUser.role,
  };
}

async function issueVerificationCode(input: SendVerificationInput): Promise<VerificationRecord> {
  'use step';

  const normalizedEmail = input.email.trim().toLowerCase();
  const organizationName = input.organizationName?.trim() ?? null;
  const code = generateOtpCode();
  const codeHash = await hashOtpCode(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000);

  const db = drizzleClientHttp;

  const [record] = await db
    .insert(onboardingEmailVerifications)
    .values({
      email: normalizedEmail,
      organizationName,
      codeHash,
      expiresAt,
      lastSentAt: new Date(),
      verificationAttempts: 0,
      verifiedAt: null,
      claimedAt: null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: onboardingEmailVerifications.email,
      set: {
        organizationName: input.organizationName?.trim() ?? null,
        codeHash,
        expiresAt,
        lastSentAt: new Date(),
        verificationAttempts: 0,
        verifiedAt: null,
        claimedAt: null,
        updatedAt: new Date(),
      },
    })
    .returning({
      id: onboardingEmailVerifications.id,
      email: onboardingEmailVerifications.email,
      organizationName: onboardingEmailVerifications.organizationName,
    });

  return {
    id: record.id,
    email: record.email,
    organizationName: record.organizationName,
    code,
    expiresAt,
  };
}

async function dispatchVerificationEmail({
  email,
  organizationName,
  code,
}: {
  email: string;
  organizationName?: string;
  code: string;
}) {
  'use step';

  const subject = 'Your Cascade verification code';
  const name = organizationName ?? 'there';

  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.info('[onboarding] RESEND_API_KEY missing; skipping email delivery. Code for %s is %s', email, code);
    return;
  }

  const { Resend } = await import('resend');
  const { OnboardingEmailTemplate } = await import('../email/onboarding-email');
  const resend = new Resend(apiKey);

  try {
    const response = await resend.emails.send({
      from: 'Cascade Onboarding <onboarding@cascade.sattwyk.com>',
      to: email,
      subject,
      react: OnboardingEmailTemplate({ name, code, otpTtlMinutes: OTP_TTL_MINUTES }),
    });

    if (response.error) {
      throw response.error;
    }

    console.info('[onboarding] Sent verification email to %s; message ID: %s', email, response.data?.id);
  } catch (error) {
    console.error('[onboarding] Failed to send verification email', error);
    throw error;
  }
}

async function verifyCode(input: VerifyVerificationInput) {
  'use step';

  const normalizedEmail = input.email.trim().toLowerCase();

  const db = drizzleClientHttp;
  const [record] = await db
    .select()
    .from(onboardingEmailVerifications)
    .where(
      and(
        eq(onboardingEmailVerifications.id, input.sessionId),
        eq(onboardingEmailVerifications.email, normalizedEmail),
      ),
    )
    .limit(1);

  if (!record) {
    throw new FatalError('No verification request found for that email address.');
  }

  if (record.claimedAt) {
    throw new FatalError('This verification code has already been used.');
  }

  if (record.verifiedAt) {
    return { id: record.id, verifiedAt: record.verifiedAt };
  }

  const now = new Date();
  if (record.expiresAt <= now) {
    throw new FatalError('The verification code has expired. Request a new one to continue.');
  }

  if (record.verificationAttempts >= MAX_VERIFICATION_ATTEMPTS) {
    throw new FatalError('Too many incorrect attempts. Request a new code to continue.');
  }

  const hashed = await hashOtpCode(input.code);
  const isValid = hashed === record.codeHash;

  await db
    .update(onboardingEmailVerifications)
    .set({
      verificationAttempts: record.verificationAttempts + 1,
      verifiedAt: isValid ? now : record.verifiedAt,
      updatedAt: now,
    })
    .where(eq(onboardingEmailVerifications.id, record.id));

  if (!isValid) {
    throw new FatalError('Invalid verification code. Check the latest email and try again.');
  }

  return { id: record.id, verifiedAt: now };
}

async function ensureVerifiedEmail(input: { email: string; sessionId: string }) {
  'use step';

  const normalizedEmail = input.email.trim().toLowerCase();

  const db = drizzleClientHttp;

  const [record] = await db
    .select()
    .from(onboardingEmailVerifications)
    .where(
      and(
        eq(onboardingEmailVerifications.id, input.sessionId),
        eq(onboardingEmailVerifications.email, normalizedEmail),
      ),
    )
    .limit(1);

  if (!record) {
    throw new FatalError('We could not find a verification record for this email. Request a new code.');
  }

  if (!record.verifiedAt) {
    throw new FatalError('Verify your email before completing onboarding.');
  }

  if (record.claimedAt) {
    throw new FatalError('This verification has already been used for onboarding.');
  }

  return record;
}

async function createOrganization({
  name,
  email,
  timezone,
  defaultMint,
  primaryWallet,
  fundingAcknowledged,
  emergencyAcknowledged,
}: {
  name: string;
  email: string;
  timezone: string;
  defaultMint: 'USDC' | 'USDT' | 'EURC';
  primaryWallet: string;
  fundingAcknowledged: true;
  emergencyAcknowledged: true;
}) {
  'use step';

  const db = drizzleClientHttp;
  const slug = await generateUniqueSlug(name);
  const now = new Date();

  const [organization] = await db
    .insert(organizations)
    .values({
      slug,
      name,
      organizationEmail: email,
      timezone,
      defaultMint,
      primaryWallet,
      accountState: 'wallet_connected',
      activityPolicyAcknowledgedAt: fundingAcknowledged ? now : null,
      emergencyPolicyAcknowledgedAt: emergencyAcknowledged ? now : null,
      onboardingCompletedAt: now,
      updatedAt: now,
    })
    .returning();

  await db.insert(organizationWallets).values({
    organizationId: organization.id,
    label: 'Primary Treasury',
    publicKey: primaryWallet,
    role: 'treasury',
    isPrimary: true,
    lastSeenAt: now,
  });

  return organization;
}

async function registerOrganizationAdmin({
  organizationId,
  contactEmail,
  organizationName,
  walletAddress,
}: {
  organizationId: string;
  contactEmail: string;
  organizationName: string;
  walletAddress: string;
}) {
  'use step';

  const normalizedEmail = contactEmail.trim().toLowerCase();
  const derivedName = deriveNameFromEmail(normalizedEmail) ?? `${organizationName} Admin`;
  const now = new Date();

  const db = drizzleClientHttp;

  // Check if this email already exists as an employee in this organization
  const [existingUser] = await db
    .select({
      id: organizationUsers.id,
      role: organizationUsers.role,
      email: organizationUsers.email,
    })
    .from(organizationUsers)
    .where(and(eq(organizationUsers.organizationId, organizationId), eq(organizationUsers.email, normalizedEmail)))
    .limit(1);

  if (existingUser && existingUser.role === 'employee') {
    throw new FatalError(
      `The email ${normalizedEmail} is already registered as an employee in this organization. Please use a different email address for the employer account.`,
    );
  }

  const [user] = await db
    .insert(organizationUsers)
    .values({
      organizationId,
      email: normalizedEmail,
      displayName: derivedName,
      walletAddress,
      role: 'employer',
      isPrimary: true,
      metadata: {
        source: 'onboarding_workflow',
        lastConfirmed: now.toISOString(),
      },
      invitedAt: now,
      joinedAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [organizationUsers.organizationId, organizationUsers.email],
      set: {
        displayName: derivedName,
        walletAddress,
        role: 'employer',
        isPrimary: true,
        joinedAt: now,
        metadata: {
          source: 'onboarding_workflow',
          lastConfirmed: now.toISOString(),
        },
        updatedAt: now,
      },
    })
    .returning();

  if (!user) {
    throw new Error('Failed to register organization admin user.');
  }

  return user;
}

async function markVerificationClaimed({ sessionId, organizationId }: { sessionId: string; organizationId: string }) {
  'use step';

  const db = drizzleClientHttp;
  await db
    .update(onboardingEmailVerifications)
    .set({
      claimedAt: new Date(),
      metadata: { organizationId },
      updatedAt: new Date(),
    })
    .where(eq(onboardingEmailVerifications.id, sessionId));
}

function getCrypto(): Crypto {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi) {
    throw new Error('Secure crypto API is not available in this environment.');
  }
  return cryptoApi;
}

function generateOtpCode(): string {
  const cryptoApi = getCrypto();
  const array = new Uint32Array(1);
  cryptoApi.getRandomValues(array);
  return (array[0] % 1_000_000).toString().padStart(6, '0');
}

async function hashOtpCode(code: string): Promise<string> {
  const cryptoApi = getCrypto();
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  const digest = await cryptoApi.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function generateUniqueSlug(name: string): Promise<string> {
  const base = slugify(name);
  let candidate = base;
  let counter = 1;

  const db = drizzleClientHttp;
  while (true) {
    const [existing] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.slug, candidate))
      .limit(1);

    if (!existing) return candidate;

    counter += 1;
    candidate = `${base}-${counter}`;
  }
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

  if (slug.length > 0) return slug;
  const cryptoApi = getCrypto();
  return `org-${cryptoApi.randomUUID().slice(0, 8)}`;
}

function deriveNameFromEmail(email: string): string | null {
  const [localPart] = email.split('@');
  if (!localPart) return null;
  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}
