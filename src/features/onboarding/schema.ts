import { z } from 'zod';

export const OnboardingMintEnum = z.enum(['USDC', 'USDT', 'EURC']);

export const OnboardingFormBaseSchema = z.object({
  organizationName: z.string().min(1, 'Organization name is required.'),
  organizationMail: z.string().email('Invalid email address'),
  verificationSessionId: z.string().uuid().optional(),
  isEmailVerified: z.boolean(),
  hasRequestedVerification: z.boolean(),
  verificationCode: z.string().length(6, 'Enter a 6-digit code').optional(),
  timezone: z.string().min(1, 'Select the timezone your team operates in.'),
  selectedMint: OnboardingMintEnum,
  fundingAcknowledged: z.boolean().refine((value) => value, { message: 'Acknowledge the funding responsibility.' }),
  emergencyAcknowledged: z
    .boolean()
    .refine((value) => value, { message: 'Acknowledge the emergency withdrawal policy.' }),
  confirmedWalletAddress: z.string().min(1, 'Confirm the wallet that will fund payroll streams.'),
});

export const OnboardingFormSchema = OnboardingFormBaseSchema.superRefine((val, ctx) => {
  if (val.hasRequestedVerification && !val.isEmailVerified) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['organizationMail'],
      message: 'Email verification is required.',
    });
  }
});

export const CompleteOnboardingSchema = OnboardingFormBaseSchema.extend({
  verificationSessionId: z.uuid({
    message: 'Missing verification session identifier.',
  }),
  fundingAcknowledged: z.literal(true, {
    message: 'Acknowledge the funding responsibility.',
  }),
  emergencyAcknowledged: z.literal(true, {
    message: 'Acknowledge the emergency withdrawal policy.',
  }),
}).superRefine((val, ctx) => {
  if (!val.isEmailVerified) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['organizationMail'],
      message: 'Email verification must be completed before continuing.',
    });
  }
});

export type OnboardingFormData = z.infer<typeof OnboardingFormBaseSchema>;
