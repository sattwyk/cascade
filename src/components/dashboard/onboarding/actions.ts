'use server';

import { cookies } from 'next/headers';

import * as Sentry from '@sentry/nextjs';
import { start } from 'workflow/api';
import { z } from 'zod';

import { CompleteOnboardingSchema } from '@/features/onboarding/schema';
import {
  employerOnboardingWorkflow,
  sendVerificationCodeWorkflow,
  verifyOnboardingCodeWorkflow,
  type CompleteOnboardingInput,
  type SendVerificationInput,
  type VerifyVerificationInput,
} from '@/workflows/employer-onboarding';

type ActionResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: string;
    };

const SendVerificationSchema = z.object({
  email: z.string().email(),
  organizationName: z.string().min(1),
}) satisfies z.ZodType<SendVerificationInput>;

const VerifyCodeSchema = z.object({
  email: z.string().email(),
  sessionId: z.string().uuid(),
  code: z.string().length(6),
}) satisfies z.ZodType<VerifyVerificationInput>;

type SendVerificationResult = {
  sessionId: string;
  expiresAt: string;
};

type VerifyResult = {
  sessionId: string;
  verifiedAt: string;
};

type CompleteResult = {
  organizationId: string;
  organizationUserId: string;
  role: 'employer' | 'employee';
};

function extractVerificationError(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    const message = error.message ?? fallback;
    const normalized =
      message
        .split(':')
        .map((part) => part.trim())
        .filter(Boolean)
        .pop() ?? message;
    return normalized || fallback;
  }
  if (typeof error === 'string') {
    return error;
  }
  return fallback;
}

export async function requestOnboardingVerification(input: unknown): Promise<ActionResult<SendVerificationResult>> {
  const parsed = SendVerificationSchema.safeParse(input);
  if (!parsed.success) {
    const message = parsed.error.issues.at(0)?.message ?? 'Invalid email address.';
    return { ok: false, error: message };
  }

  try {
    const run = await start(sendVerificationCodeWorkflow, [parsed.data]);
    const result = await run.returnValue;

    Sentry.logger.info('Verification code sent successfully', {
      email: parsed.data.email,
      sessionId: result.sessionId,
    });
    return {
      ok: true,
      data: {
        sessionId: result.sessionId,
        expiresAt: result.expiresAt instanceof Date ? result.expiresAt.toISOString() : String(result.expiresAt),
      },
    };
  } catch (error) {
    Sentry.logger.error('Failed to send verification code', { error, email: parsed.data.email });
    console.error('[onboarding] Failed to send verification code', error);
    return {
      ok: false,
      error: 'We could not send the verification code. Please try again in a moment.',
    };
  }
}

export async function verifyOnboardingCode(input: unknown): Promise<ActionResult<VerifyResult>> {
  const parsed = VerifyCodeSchema.safeParse(input);
  if (!parsed.success) {
    const message = parsed.error.issues.at(0)?.message ?? 'Invalid verification details.';
    return { ok: false, error: message };
  }

  try {
    const run = await start(verifyOnboardingCodeWorkflow, [parsed.data]);
    const result = await run.returnValue;

    Sentry.logger.info('Verification code verified successfully', {
      email: parsed.data.email,
      sessionId: result.sessionId,
    });
    return {
      ok: true,
      data: {
        sessionId: result.sessionId,
        verifiedAt: result.verifiedAt instanceof Date ? result.verifiedAt.toISOString() : String(result.verifiedAt),
      },
    };
  } catch (error) {
    Sentry.logger.error('Verification code verification failed', {
      error,
      email: parsed.data.email,
      sessionId: parsed.data.sessionId,
    });
    console.error('[onboarding] Verification failed', error);
    const message = extractVerificationError(error, 'Unable to verify the code. Request a new one.');
    return { ok: false, error: message };
  }
}

export async function completeEmployerOnboarding(input: unknown): Promise<ActionResult<CompleteResult>> {
  const parsed = CompleteOnboardingSchema.safeParse(input);
  if (!parsed.success) {
    const message = parsed.error.issues.at(0)?.message ?? 'Some onboarding details are missing.';
    return { ok: false, error: message };
  }

  const payload: CompleteOnboardingInput = {
    organizationName: parsed.data.organizationName,
    organizationMail: parsed.data.organizationMail,
    verificationSessionId: parsed.data.verificationSessionId,
    timezone: parsed.data.timezone,
    selectedMint: parsed.data.selectedMint,
    fundingAcknowledged: parsed.data.fundingAcknowledged,
    emergencyAcknowledged: parsed.data.emergencyAcknowledged,
    confirmedWalletAddress: parsed.data.confirmedWalletAddress,
  };

  try {
    const run = await start(employerOnboardingWorkflow, [payload]);
    const result = (await run.returnValue) as CompleteResult;

    const cookieStore = await cookies();
    const normalizedEmail = payload.organizationMail.trim().toLowerCase();
    if (normalizedEmail) {
      cookieStore.set({
        name: 'cascade-user-email',
        value: normalizedEmail,
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
      });
    }
    if (payload.confirmedWalletAddress) {
      cookieStore.set({
        name: 'cascade-wallet',
        value: payload.confirmedWalletAddress,
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
      });
    }
    cookieStore.set({
      name: 'cascade-user-role',
      value: result.role,
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
    });

    Sentry.logger.info('Employer onboarding completed successfully', {
      organizationId: result.organizationId,
      organizationUserId: result.organizationUserId,
      email: normalizedEmail,
    });

    return { ok: true, data: result };
  } catch (error) {
    Sentry.logger.error('Employer onboarding failed', { error, payload });
    console.error('[onboarding] Failed to complete employer onboarding', error);
    const message =
      error instanceof Error
        ? error.message
        : 'We could not complete onboarding. Please review your details and try again.';
    return { ok: false, error: message };
  }
}
