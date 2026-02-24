'use server';

import { desc, eq } from 'drizzle-orm';

import { drizzleClientHttp } from '@/core/db';
import { organizationActivity } from '@/core/db/schema';

import { resolveOrganizationContext } from './organization-context';

type OrganizationActivityInsert = typeof organizationActivity.$inferInsert;
type StreamEventType = OrganizationActivityInsert['activityType'];
type ActorType = OrganizationActivityInsert['actorType'];

export type ActivityStatus = 'success' | 'failed' | 'cancelled';

export type CreateActivityLogInput = {
  title: string;
  description?: string;
  activityType?: StreamEventType;
  actorType?: ActorType;
  actorAddress?: string | null;
  streamId?: string;
  employeeId?: string;
  status?: ActivityStatus;
  errorMessage?: string;
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

  // Merge status and error information into metadata
  const metadata = {
    ...input.metadata,
    status: input.status ?? 'success',
    ...(input.errorMessage && { errorMessage: input.errorMessage }),
  };

  const values: OrganizationActivityInsert = {
    organizationId,
    streamId: input.streamId ?? null,
    employeeId: input.employeeId ?? null,
    title: input.title,
    description: input.description ?? null,
    activityType: input.activityType ?? 'stream_top_up',
    actorType: input.actorType ?? 'employer',
    actorAddress: input.actorAddress ?? primaryWallet ?? null,
    metadata,
  };

  const [record] = await drizzleClientHttp.insert(organizationActivity).values(values).returning({
    id: organizationActivity.id,
    occurredAt: organizationActivity.occurredAt,
  });

  return { ok: true, id: record.id, occurredAt: record.occurredAt } as const;
}

export async function getActivityLog({
  limit = 50,
  organizationId,
}: {
  limit?: number;
  organizationId?: string;
} = {}): Promise<ActivityLogEntry[]> {
  const resolvedOrganizationId =
    organizationId ??
    (await resolveOrganizationContext().then((context) => (context.status === 'ok' ? context.organizationId : null)));
  if (!resolvedOrganizationId) return [];

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
    .where(eq(organizationActivity.organizationId, resolvedOrganizationId))
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
