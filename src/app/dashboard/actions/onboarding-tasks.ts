'use server';

import { drizzleClientHttp } from '@/db';
import { onboardingTaskEnum, onboardingTasks } from '@/db/schema';

import { resolveOrganizationContext } from './organization-context';

const hasDatabase = Boolean(process.env.DATABASE_URL?.trim());

export type OnboardingTask = (typeof onboardingTaskEnum.enumValues)[number];

export async function completeOnboardingTask(task: OnboardingTask, metadata?: Record<string, unknown>) {
  if (!hasDatabase) {
    return { ok: false, reason: 'database-disabled' } as const;
  }

  const context = await resolveOrganizationContext();
  if (context.status !== 'ok') {
    return { ok: false, reason: context.reason } as const;
  }

  const now = new Date();
  const values = {
    organizationId: context.organizationId,
    task,
    completedAt: now,
    metadata: metadata ?? {},
  };

  await drizzleClientHttp
    .insert(onboardingTasks)
    .values(values)
    .onConflictDoUpdate({
      target: [onboardingTasks.organizationId, onboardingTasks.task],
      set: {
        completedAt: now,
        metadata: metadata ?? onboardingTasks.metadata,
      },
    });

  return { ok: true } as const;
}
