'use server';

import { desc, eq } from 'drizzle-orm';

import { drizzleClientHttp } from '@/db';
import { organizationActivity } from '@/db/schema';

import { resolveOrganizationContext } from './organization-context';

export type StreamActivity = {
  id: string;
  title: string;
  description: string | null;
  activityType: string;
  actorAddress: string | null;
  occurredAt: string;
  metadata: Record<string, unknown>;
};

export async function getStreamActivity(streamId: string): Promise<StreamActivity[]> {
  const context = await resolveOrganizationContext();
  if (context.status !== 'ok') {
    return [];
  }

  // First get the stream to find its address
  const { streams: streamsTable } = await import('@/db/schema');
  const stream = await drizzleClientHttp
    .select({ streamAddress: streamsTable.streamAddress })
    .from(streamsTable)
    .where(eq(streamsTable.id, streamId))
    .limit(1);

  if (stream.length === 0) {
    return [];
  }

  const streamAddress = stream[0].streamAddress;

  // Get all activities for this stream - either linked by streamId or by streamAddress in metadata
  const rows = await drizzleClientHttp
    .select({
      id: organizationActivity.id,
      title: organizationActivity.title,
      description: organizationActivity.description,
      activityType: organizationActivity.activityType,
      actorAddress: organizationActivity.actorAddress,
      occurredAt: organizationActivity.occurredAt,
      metadata: organizationActivity.metadata,
      streamId: organizationActivity.streamId,
    })
    .from(organizationActivity)
    .where(eq(organizationActivity.organizationId, context.organizationId))
    .orderBy(desc(organizationActivity.occurredAt))
    .limit(200); // Get more rows since we'll filter in memory

  // Filter to only activities related to this stream
  const filteredRows = rows.filter((row) => {
    // Direct streamId match
    if (row.streamId === streamId) return true;

    // Check if metadata contains this stream's address
    if (row.metadata && typeof row.metadata === 'object') {
      const metadata = row.metadata as Record<string, unknown>;
      return metadata.streamAddress === streamAddress;
    }

    return false;
  });

  return filteredRows.slice(0, 50).map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description ?? null,
    activityType: row.activityType ?? 'unknown',
    actorAddress: row.actorAddress ?? null,
    occurredAt: row.occurredAt?.toISOString?.() ?? new Date().toISOString(),
    metadata: row.metadata ?? {},
  }));
}
