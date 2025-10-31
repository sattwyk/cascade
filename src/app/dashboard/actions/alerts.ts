'use server';

import { and, desc, eq, isNull, or } from 'drizzle-orm';

import { drizzleClientHttp } from '@/db';
import { alerts, type alertSeverityEnum, type alertStatusEnum, type alertTypeEnum } from '@/db/schema';

import { resolveOrganizationContext } from './organization-context';

type AlertType = (typeof alertTypeEnum)['enumValues'][number];
type AlertSeverity = (typeof alertSeverityEnum)['enumValues'][number];
type AlertStatus = (typeof alertStatusEnum)['enumValues'][number];

export type DashboardAlert = {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  description: string | null;
  streamId: string | null;
  employeeId: string | null;
  triggeredAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  metadata: Record<string, unknown>;
};

export type CreateAlertInput = {
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description?: string;
  streamId?: string;
  employeeId?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Get all alerts for the current organization
 */
export async function getDashboardAlerts(options?: { status?: AlertStatus | 'all' }) {
  const context = await resolveOrganizationContext();
  if (context.status !== 'ok') {
    return [];
  }

  const { organizationId } = context;
  const statusFilter = options?.status && options.status !== 'all' ? options.status : null;

  const conditions = [eq(alerts.organizationId, organizationId)];

  if (statusFilter) {
    conditions.push(eq(alerts.status, statusFilter));
  } else {
    // By default, only show open and acknowledged alerts
    conditions.push(or(eq(alerts.status, 'open'), eq(alerts.status, 'acknowledged'))!);
  }

  const rows = await drizzleClientHttp
    .select()
    .from(alerts)
    .where(and(...conditions))
    .orderBy(desc(alerts.triggeredAt), desc(alerts.createdAt));

  return rows.map(
    (row): DashboardAlert => ({
      id: row.id,
      type: row.type,
      severity: row.severity,
      status: row.status,
      title: row.title,
      description: row.description,
      streamId: row.streamId,
      employeeId: row.employeeId,
      triggeredAt: row.triggeredAt.toISOString(),
      acknowledgedAt: row.acknowledgedAt?.toISOString() ?? null,
      resolvedAt: row.resolvedAt?.toISOString() ?? null,
      metadata: row.metadata,
    }),
  );
}

/**
 * Create a new alert
 */
export async function createAlert(input: CreateAlertInput) {
  const context = await resolveOrganizationContext();
  if (context.status !== 'ok') {
    return { ok: false, reason: context.reason } as const;
  }

  const { organizationId } = context;

  try {
    // Check if similar alert already exists and is open
    const existingAlert = await drizzleClientHttp
      .select({ id: alerts.id })
      .from(alerts)
      .where(
        and(
          eq(alerts.organizationId, organizationId),
          eq(alerts.type, input.type),
          eq(alerts.status, 'open'),
          input.streamId ? eq(alerts.streamId, input.streamId) : isNull(alerts.streamId),
        ),
      )
      .limit(1)
      .then((rows) => rows[0]);

    if (existingAlert) {
      // Don't create duplicate alert
      return { ok: true, alertId: existingAlert.id, duplicate: true } as const;
    }

    const [alert] = await drizzleClientHttp
      .insert(alerts)
      .values({
        organizationId,
        streamId: input.streamId ?? null,
        employeeId: input.employeeId ?? null,
        type: input.type,
        severity: input.severity,
        status: 'open',
        title: input.title,
        description: input.description ?? null,
        metadata: input.metadata ?? {},
        triggeredAt: new Date(),
      })
      .returning({ id: alerts.id });

    return { ok: true, alertId: alert.id, duplicate: false } as const;
  } catch (error) {
    console.error('Failed to create alert:', error);
    return {
      ok: false,
      reason: error instanceof Error ? error.message : 'Failed to create alert',
    } as const;
  }
}

/**
 * Acknowledge an alert
 */
export async function acknowledgeAlert(alertId: string) {
  const context = await resolveOrganizationContext();
  if (context.status !== 'ok') {
    return { ok: false, reason: context.reason } as const;
  }

  const { organizationId } = context;

  try {
    await drizzleClientHttp
      .update(alerts)
      .set({
        status: 'acknowledged',
        acknowledgedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(alerts.id, alertId), eq(alerts.organizationId, organizationId)));

    return { ok: true } as const;
  } catch (error) {
    console.error('Failed to acknowledge alert:', error);
    return {
      ok: false,
      reason: error instanceof Error ? error.message : 'Failed to acknowledge alert',
    } as const;
  }
}

/**
 * Resolve an alert
 */
export async function resolveAlert(alertId: string) {
  const context = await resolveOrganizationContext();
  if (context.status !== 'ok') {
    return { ok: false, reason: context.reason } as const;
  }

  const { organizationId } = context;

  try {
    await drizzleClientHttp
      .update(alerts)
      .set({
        status: 'resolved',
        resolvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(alerts.id, alertId), eq(alerts.organizationId, organizationId)));

    return { ok: true } as const;
  } catch (error) {
    console.error('Failed to resolve alert:', error);
    return {
      ok: false,
      reason: error instanceof Error ? error.message : 'Failed to resolve alert',
    } as const;
  }
}

/**
 * Dismiss an alert
 */
export async function dismissAlert(alertId: string) {
  const context = await resolveOrganizationContext();
  if (context.status !== 'ok') {
    return { ok: false, reason: context.reason } as const;
  }

  const { organizationId } = context;

  try {
    await drizzleClientHttp
      .update(alerts)
      .set({
        status: 'dismissed',
        updatedAt: new Date(),
      })
      .where(and(eq(alerts.id, alertId), eq(alerts.organizationId, organizationId)));

    return { ok: true } as const;
  } catch (error) {
    console.error('Failed to dismiss alert:', error);
    return {
      ok: false,
      reason: error instanceof Error ? error.message : 'Failed to dismiss alert',
    } as const;
  }
}

/**
 * Auto-resolve alerts that are no longer relevant
 */
export async function autoResolveAlerts(streamId: string, alertTypes: AlertType[]) {
  const context = await resolveOrganizationContext();
  if (context.status !== 'ok') {
    return { ok: false, reason: context.reason } as const;
  }

  const { organizationId } = context;

  try {
    await drizzleClientHttp
      .update(alerts)
      .set({
        status: 'resolved',
        resolvedAt: new Date(),
        updatedAt: new Date(),
        metadata: { autoResolved: true, resolvedAt: new Date().toISOString() },
      })
      .where(
        and(
          eq(alerts.organizationId, organizationId),
          eq(alerts.streamId, streamId),
          or(...alertTypes.map((type) => eq(alerts.type, type))),
          or(eq(alerts.status, 'open'), eq(alerts.status, 'acknowledged'))!,
        ),
      );

    return { ok: true } as const;
  } catch (error) {
    console.error('Failed to auto-resolve alerts:', error);
    return { ok: false, reason: 'Failed to auto-resolve alerts' } as const;
  }
}
