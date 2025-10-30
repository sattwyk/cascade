'use server';

import { desc, eq } from 'drizzle-orm';

import { drizzleClientHttp } from '@/db';
import { organizationActivity } from '@/db/schema';

import { resolveOrganizationContext } from './organization-context';

type OrganizationActivityInsert = typeof organizationActivity.$inferInsert;
type StreamEventType = OrganizationActivityInsert['activityType'];
type ActorType = OrganizationActivityInsert['actorType'];

export type CreateActivityLogInput = {
  title: string;
  description?: string;
  activityType?: StreamEventType;
  actorType?: ActorType;
  actorAddress?: string | null;
  metadata?: Record<string, unknown>;
};

export type ActivityLogEntry = {
  id: string;
  title: string;
  description: string | null;
  activityType: StreamEventType;
  actorType: ActorType;
  actorAddress: string | null;
  occurredAt: string;
  metadata: Record<string, unknown>;
};

export async function createActivityLog(input: CreateActivityLogInput) {
  const context = await resolveOrganizationContext();
  if (context.status !== 'ok') {
    return { ok: false, reason: context.reason } as const;
  }

  const { organizationId, primaryWallet } = context;

  const values: OrganizationActivityInsert = {
    organizationId,
    title: input.title,
    description: input.description ?? null,
    activityType: input.activityType ?? 'stream_top_up',
    actorType: input.actorType ?? 'employer',
    actorAddress: input.actorAddress ?? primaryWallet ?? null,
    metadata: input.metadata ?? {},
  };

  const [record] = await drizzleClientHttp.insert(organizationActivity).values(values).returning({
    id: organizationActivity.id,
    occurredAt: organizationActivity.occurredAt,
  });

  return { ok: true, id: record.id, occurredAt: record.occurredAt } as const;
}

export async function getActivityLog({ limit = 50 }: { limit?: number } = {}): Promise<ActivityLogEntry[]> {
  const context = await resolveOrganizationContext();
  if (context.status !== 'ok') {
    return [];
  }

  const rows = await drizzleClientHttp
    .select({
      id: organizationActivity.id,
      title: organizationActivity.title,
      description: organizationActivity.description,
      activityType: organizationActivity.activityType,
      actorType: organizationActivity.actorType,
      actorAddress: organizationActivity.actorAddress,
      occurredAt: organizationActivity.occurredAt,
      metadata: organizationActivity.metadata,
    })
    .from(organizationActivity)
    .where(eq(organizationActivity.organizationId, context.organizationId))
    .orderBy(desc(organizationActivity.occurredAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description ?? null,
    activityType: row.activityType,
    actorType: row.actorType,
    actorAddress: row.actorAddress ?? null,
    occurredAt: row.occurredAt?.toISOString?.() ?? new Date().toISOString(),
    metadata: row.metadata ?? {},
  }));
}
