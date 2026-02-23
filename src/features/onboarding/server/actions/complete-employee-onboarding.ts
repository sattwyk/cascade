'use server';

import { cookies } from 'next/headers';

import * as Sentry from '@sentry/nextjs';
import { start } from 'workflow/api';
import { z } from 'zod';

import {
  completeEmployeeOnboardingWorkflow,
  type CompleteEmployeeOnboardingInput,
} from '@/core/workflows/employee-onboarding';

type ActionResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: string;
    };

const CompleteEmployeeOnboardingSchema = z.object({
  inviteToken: z.string().uuid('Invalid invitation token.'),
  displayName: z.string().min(1, 'Your name is required.'),
  walletAddress: z.string().min(32, 'Provide a valid Solana wallet address.').max(64, 'Wallet address looks too long.'),
  backupWallet: z
    .string()
    .optional()
    .transform((value) => (value && value.trim().length > 0 ? value : undefined)),
  acceptPolicies: z.literal(true, {
    message: 'You must acknowledge the policies before continuing.',
  }),
});

type CompleteEmployeeOnboardingResult = {
  redirect: string;
};

export async function completeEmployeeOnboarding(
  input: unknown,
): Promise<ActionResult<CompleteEmployeeOnboardingResult>> {
  const parsed = CompleteEmployeeOnboardingSchema.safeParse(input);
  if (!parsed.success) {
    const message = parsed.error.issues.at(0)?.message ?? 'Some details are missing.';
    return { ok: false, error: message };
  }

  const payload: CompleteEmployeeOnboardingInput = {
    inviteToken: parsed.data.inviteToken,
    displayName: parsed.data.displayName,
    walletAddress: parsed.data.walletAddress,
    backupWallet: parsed.data.backupWallet ?? null,
    acceptPolicies: parsed.data.acceptPolicies,
  };

  try {
    const run = await start(completeEmployeeOnboardingWorkflow, [payload]);
    const result = await run.returnValue;

    const cookieStore = await cookies();
    cookieStore.set({
      name: 'cascade-user-role',
      value: 'employee',
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });
    cookieStore.set({
      name: 'cascade-user-email',
      value: result.employeeEmail,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });
    cookieStore.set({
      name: 'cascade-wallet',
      value: parsed.data.walletAddress,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });

    return { ok: true, data: { redirect: '/dashboard' } };
  } catch (error) {
    Sentry.logger.error('Unable to complete employee onboarding', {
      error,
      hasBackupWallet: Boolean(parsed.data.backupWallet),
    });
    console.error('[employee-onboarding] Unable to complete onboarding', error);
    const message =
      error instanceof Error
        ? error.message || 'We could not finish activating your account.'
        : 'We could not finish activating your account.';
    return { ok: false, error: message };
  }
}
