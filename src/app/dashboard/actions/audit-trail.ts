'use server';

import { desc, eq, or, sql } from 'drizzle-orm';

import { drizzleClientHttp } from '@/db';
import {
  employees,
  employeeStatusHistory,
  organizationActivity,
  organizations,
  streamEvents,
  streams,
} from '@/db/schema';

import { resolveOrganizationContext } from './organization-context';

export type AuditAction = 'create' | 'update' | 'delete' | 'suspend' | 'reactivate' | 'close' | 'withdraw' | 'top_up';

export type AuditEntry = {
  id: string;
  timestamp: string;
  entity: string;
  entityId: string;
  entityName?: string;
  action: AuditAction;
  changes: Record<string, { before: string; after: string }>;
  actor: string;
  actorType: 'employer' | 'employee' | 'system';
  ipAddress: string;
  signature?: string;
  metadata?: Record<string, unknown>;
};

type AuditTrailFilters = {
  limit?: number;
  entityType?: string;
  action?: AuditAction;
  startDate?: Date;
  endDate?: Date;
};

/**
 * Fetches comprehensive audit trail by combining data from multiple sources:
 * - Employee status changes
 * - Stream events
 * - Organization activities
 * - Stream lifecycle changes
 */
export async function getAuditTrail(filters: AuditTrailFilters = {}): Promise<AuditEntry[]> {
  const context = await resolveOrganizationContext();
  if (context.status !== 'ok') {
    return [];
  }

  const { limit = 100 } = filters;
  const auditEntries: AuditEntry[] = [];

  // 1. Fetch employee status history
  const employeeStatusChanges = await drizzleClientHttp
    .select({
      id: employeeStatusHistory.id,
      employeeId: employeeStatusHistory.employeeId,
      fromStatus: employeeStatusHistory.fromStatus,
      toStatus: employeeStatusHistory.toStatus,
      changedByWallet: employeeStatusHistory.changedByWallet,
      note: employeeStatusHistory.note,
      createdAt: employeeStatusHistory.createdAt,
      employeeName: employees.fullName,
      employeeEmail: employees.email,
    })
    .from(employeeStatusHistory)
    .leftJoin(employees, eq(employeeStatusHistory.employeeId, employees.id))
    .where(eq(employeeStatusHistory.organizationId, context.organizationId))
    .orderBy(desc(employeeStatusHistory.createdAt))
    .limit(limit);

  for (const change of employeeStatusChanges) {
    auditEntries.push({
      id: change.id,
      timestamp: change.createdAt.toISOString(),
      entity: 'Employee',
      entityId: change.employeeId,
      entityName: change.employeeName || change.employeeEmail || 'Unknown',
      action: 'update',
      changes: {
        status: {
          before: change.fromStatus || 'none',
          after: change.toStatus,
        },
        ...(change.note && {
          note: {
            before: '-',
            after: change.note,
          },
        }),
      },
      actor: change.changedByWallet || 'system',
      actorType: change.changedByWallet ? 'employer' : 'system',
      ipAddress: '0.0.0.0', // We don't track IP in the current schema
    });
  }

  // 2. Fetch stream events
  const streamEventRecords = await drizzleClientHttp
    .select({
      id: streamEvents.id,
      streamId: streamEvents.streamId,
      eventType: streamEvents.eventType,
      actorType: streamEvents.actorType,
      actorAddress: streamEvents.actorAddress,
      signature: streamEvents.signature,
      slot: streamEvents.slot,
      amount: streamEvents.amount,
      occurredAt: streamEvents.occurredAt,
      metadata: streamEvents.metadata,
      streamAddress: streams.streamAddress,
      employeeName: employees.fullName,
    })
    .from(streamEvents)
    .leftJoin(streams, eq(streamEvents.streamId, streams.id))
    .leftJoin(employees, eq(streams.employeeId, employees.id))
    .where(eq(streamEvents.organizationId, context.organizationId))
    .orderBy(desc(streamEvents.occurredAt))
    .limit(limit);

  for (const event of streamEventRecords) {
    const action = mapStreamEventToAction(event.eventType);
    const changes: Record<string, { before: string; after: string }> = {};

    if (event.amount) {
      const amountInSol = (Number(event.amount) / 1_000_000_000).toFixed(6);
      changes.amount = {
        before: '-',
        after: `${amountInSol} tokens`,
      };
    }

    if (event.eventType === 'stream_created') {
      changes.employee = {
        before: '-',
        after: event.employeeName || 'Unknown',
      };
    }

    auditEntries.push({
      id: event.id,
      timestamp: event.occurredAt.toISOString(),
      entity: 'Stream',
      entityId: event.streamId,
      entityName: event.streamAddress || 'Unknown',
      action,
      changes,
      actor: event.actorAddress || 'system',
      actorType: event.actorType,
      ipAddress: '0.0.0.0',
      signature: event.signature || undefined,
      metadata: event.metadata,
    });
  }

  // 3. Fetch organization activities
  const activities = await drizzleClientHttp
    .select({
      id: organizationActivity.id,
      streamId: organizationActivity.streamId,
      employeeId: organizationActivity.employeeId,
      activityType: organizationActivity.activityType,
      actorType: organizationActivity.actorType,
      actorAddress: organizationActivity.actorAddress,
      title: organizationActivity.title,
      description: organizationActivity.description,
      signature: organizationActivity.signature,
      occurredAt: organizationActivity.occurredAt,
      metadata: organizationActivity.metadata,
      streamAddress: streams.streamAddress,
      employeeName: employees.fullName,
    })
    .from(organizationActivity)
    .leftJoin(streams, eq(organizationActivity.streamId, streams.id))
    .leftJoin(employees, eq(organizationActivity.employeeId, employees.id))
    .where(eq(organizationActivity.organizationId, context.organizationId))
    .orderBy(desc(organizationActivity.occurredAt))
    .limit(limit);

  for (const activity of activities) {
    const action = mapActivityTypeToAction(activity.activityType);
    const entityType = activity.streamId ? 'Stream' : activity.employeeId ? 'Employee' : 'Organization';
    const entityId = activity.streamId || activity.employeeId || context.organizationId;
    const entityName =
      activity.streamAddress || activity.employeeName || (await getOrganizationName(context.organizationId));

    const changes: Record<string, { before: string; after: string }> = {};

    if (activity.description) {
      changes.description = {
        before: '-',
        after: activity.description,
      };
    }

    // Extract status from metadata if available
    if (activity.metadata && 'status' in activity.metadata) {
      changes.status = {
        before: '-',
        after: String(activity.metadata.status),
      };
    }

    auditEntries.push({
      id: activity.id,
      timestamp: activity.occurredAt.toISOString(),
      entity: entityType,
      entityId,
      entityName,
      action,
      changes,
      actor: activity.actorAddress || 'system',
      actorType: activity.actorType,
      ipAddress: '0.0.0.0',
      signature: activity.signature || undefined,
      metadata: activity.metadata,
    });
  }

  // Sort all entries by timestamp (descending)
  auditEntries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Apply filters
  let filteredEntries = auditEntries;

  if (filters.entityType) {
    filteredEntries = filteredEntries.filter((entry) =>
      entry.entity.toLowerCase().includes(filters.entityType!.toLowerCase()),
    );
  }

  if (filters.action) {
    filteredEntries = filteredEntries.filter((entry) => entry.action === filters.action);
  }

  if (filters.startDate) {
    filteredEntries = filteredEntries.filter((entry) => new Date(entry.timestamp) >= filters.startDate!);
  }

  if (filters.endDate) {
    filteredEntries = filteredEntries.filter((entry) => new Date(entry.timestamp) <= filters.endDate!);
  }

  // Limit the final result
  return filteredEntries.slice(0, limit);
}

/**
 * Maps stream event types to audit actions
 */
function mapStreamEventToAction(eventType: string): AuditAction {
  const mapping: Record<string, AuditAction> = {
    stream_created: 'create',
    stream_top_up: 'top_up',
    stream_withdrawn: 'withdraw',
    stream_refresh_activity: 'update',
    stream_emergency_withdraw: 'withdraw',
    stream_closed: 'close',
    stream_reactivated: 'reactivate',
  };

  return mapping[eventType] || 'update';
}

/**
 * Maps activity types to audit actions
 */
function mapActivityTypeToAction(activityType: string): AuditAction {
  const mapping: Record<string, AuditAction> = {
    stream_created: 'create',
    stream_top_up: 'top_up',
    stream_withdrawn: 'withdraw',
    stream_refresh_activity: 'update',
    stream_emergency_withdraw: 'withdraw',
    stream_closed: 'close',
    stream_reactivated: 'reactivate',
  };

  return mapping[activityType] || 'update';
}

/**
 * Helper to get organization name by ID
 */
async function getOrganizationName(organizationId: string): Promise<string> {
  const [org] = await drizzleClientHttp
    .select({ name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  return org?.name || 'Unknown';
}

/**
 * Exports audit trail data to CSV format
 */
export async function exportAuditTrail(filters: AuditTrailFilters = {}): Promise<string> {
  const entries = await getAuditTrail(filters);

  // CSV headers
  const headers = ['Timestamp', 'Entity', 'Entity ID', 'Action', 'Actor', 'Actor Type', 'Changes', 'Signature'];
  const rows = entries.map((entry) => [
    new Date(entry.timestamp).toISOString(),
    entry.entity,
    entry.entityId,
    entry.action,
    entry.actor,
    entry.actorType,
    JSON.stringify(entry.changes),
    entry.signature || '',
  ]);

  // Convert to CSV
  const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');

  return csv;
}
