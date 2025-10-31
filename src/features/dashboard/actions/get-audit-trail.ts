'use server';

import { desc, eq, sql } from 'drizzle-orm';

import { drizzleClientHttp } from '@/db';
import { employees, employeeStatusHistory, organizationActivity, streamEvents, streams } from '@/db/schema';

export type AuditTrailEntry = {
  id: string;
  timestamp: Date;
  action: string;
  performedBy: string;
  details: string;
  category: 'employee' | 'stream' | 'organization' | 'system';
  metadata?: Record<string, unknown>;
};

export async function getAuditTrail(
  organizationId: string,
  options?: {
    limit?: number;
    offset?: number;
    category?: AuditTrailEntry['category'];
  },
): Promise<{ entries: AuditTrailEntry[]; total: number }> {
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  try {
    // Fetch employee status history
    let statusHistory: Array<{
      id: string;
      timestamp: Date;
      action: string;
      performedBy: string;
      details: string;
      category: string;
      metadata: Record<string, unknown>;
    }> = [];
    try {
      statusHistory = await drizzleClientHttp
        .select({
          id: employeeStatusHistory.id,
          timestamp: employeeStatusHistory.createdAt,
          action: sql<string>`'Status Change'`.as('action'),
          performedBy: sql<string>`COALESCE(${employeeStatusHistory.changedByWallet}, 'System')`.as('performed_by'),
          details:
            sql<string>`CONCAT('Employee status changed from ', COALESCE(CAST(${employeeStatusHistory.fromStatus} AS TEXT), 'none'), ' to ', CAST(${employeeStatusHistory.toStatus} AS TEXT), COALESCE(CONCAT(' - ', ${employeeStatusHistory.note}), ''))`.as(
              'details',
            ),
          category: sql<string>`'employee'`.as('category'),
          metadata: sql<Record<string, unknown>>`json_build_object(
          'employeeId', CAST(${employeeStatusHistory.employeeId} AS TEXT),
          'fromStatus', CAST(${employeeStatusHistory.fromStatus} AS TEXT),
          'toStatus', CAST(${employeeStatusHistory.toStatus} AS TEXT),
          'note', ${employeeStatusHistory.note}
        )`.as('metadata'),
        })
        .from(employeeStatusHistory)
        .innerJoin(employees, eq(employeeStatusHistory.employeeId, employees.id))
        .where(eq(employees.organizationId, organizationId))
        .orderBy(desc(employeeStatusHistory.createdAt))
        .limit(limit);
    } catch (err) {
      console.error('Error fetching employee status history:', err);
    }

    // Fetch stream events
    let streamEventsData: Array<{
      id: string;
      timestamp: Date;
      action: string;
      performedBy: string;
      details: string;
      category: string;
      metadata: Record<string, unknown>;
    }> = [];
    try {
      streamEventsData = await drizzleClientHttp
        .select({
          id: streamEvents.id,
          timestamp: streamEvents.occurredAt,
          action: streamEvents.eventType,
          performedBy: sql<string>`COALESCE(${streamEvents.actorAddress}, 'System')`.as('performed_by'),
          details:
            sql<string>`CONCAT(CAST(${streamEvents.eventType} AS TEXT), ' - ', COALESCE(${employees.fullName}, 'Unknown Employee'))`.as(
              'details',
            ),
          category: sql<string>`'stream'`.as('category'),
          metadata: streamEvents.metadata,
        })
        .from(streamEvents)
        .innerJoin(streams, eq(streamEvents.streamId, streams.id))
        .innerJoin(employees, eq(streams.employeeId, employees.id))
        .where(eq(streamEvents.organizationId, organizationId))
        .orderBy(desc(streamEvents.occurredAt))
        .limit(limit);
    } catch (err) {
      console.error('Error fetching stream events:', err);
    }

    // Fetch organization activity
    let orgActivity: Array<{
      id: string;
      timestamp: Date;
      action: string;
      performedBy: string;
      details: string;
      category: string;
      metadata: Record<string, unknown>;
    }> = [];
    try {
      orgActivity = await drizzleClientHttp
        .select({
          id: organizationActivity.id,
          timestamp: organizationActivity.occurredAt,
          action: organizationActivity.activityType,
          performedBy: sql<string>`COALESCE(${organizationActivity.actorAddress}, 'System')`.as('performed_by'),
          details: sql<string>`COALESCE(${organizationActivity.description}, ${organizationActivity.title}, '')`.as(
            'details',
          ),
          category: sql<string>`'organization'`.as('category'),
          metadata: organizationActivity.metadata,
        })
        .from(organizationActivity)
        .where(eq(organizationActivity.organizationId, organizationId))
        .orderBy(desc(organizationActivity.occurredAt))
        .limit(limit);
    } catch (err) {
      console.error('Error fetching organization activity:', err);
    }

    // Combine all entries
    const statusEntries = statusHistory.map((entry: (typeof statusHistory)[number]) => ({
      id: entry.id,
      timestamp: new Date(entry.timestamp),
      action: entry.action,
      performedBy: entry.performedBy || 'System',
      details: entry.details,
      category: 'employee' as const,
      metadata: entry.metadata as Record<string, unknown> | undefined,
    }));

    const streamEntries = streamEventsData.map((entry: (typeof streamEventsData)[number]) => ({
      id: entry.id,
      timestamp: new Date(entry.timestamp),
      action: entry.action,
      performedBy: entry.performedBy || 'System',
      details: entry.details,
      category: 'stream' as const,
      metadata: entry.metadata as Record<string, unknown> | undefined,
    }));

    const orgEntries = orgActivity.map((entry: (typeof orgActivity)[number]) => ({
      id: entry.id,
      timestamp: new Date(entry.timestamp),
      action: entry.action,
      performedBy: entry.performedBy || 'System',
      details: entry.details,
      category: 'organization' as const,
      metadata: entry.metadata as Record<string, unknown> | undefined,
    }));

    let allEntries: AuditTrailEntry[] = [...statusEntries, ...streamEntries, ...orgEntries];

    // Filter by category if specified
    if (options?.category) {
      allEntries = allEntries.filter((entry) => entry.category === options.category);
    }

    // Sort by timestamp descending
    allEntries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply pagination
    const paginatedEntries = allEntries.slice(offset, offset + limit);
    const total = allEntries.length;

    return {
      entries: paginatedEntries,
      total,
    };
  } catch (error) {
    console.error('Error fetching audit trail:', error);
    return {
      entries: [],
      total: 0,
    };
  }
}
