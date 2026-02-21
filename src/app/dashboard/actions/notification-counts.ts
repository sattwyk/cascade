'use server';

import * as Sentry from '@sentry/nextjs';
import { and, count, eq, isNull, or } from 'drizzle-orm';

import { drizzleClientHttp } from '@/db';
import { alerts, employeeInvitations, streams } from '@/db/schema';

import { resolveOrganizationContext } from './organization-context';

export type NotificationCounts = {
  draftStreams: number;
  pendingInvitations: number;
  unreadAuditItems: number;
};

/**
 * Get notification counts for the sidebar
 * Returns counts for draft streams, pending invitations, and unread audit trail items
 */
export async function getNotificationCounts(): Promise<NotificationCounts> {
  const context = await resolveOrganizationContext();

  if (context.status !== 'ok') {
    return {
      draftStreams: 0,
      pendingInvitations: 0,
      unreadAuditItems: 0,
    };
  }

  try {
    const [draftStreamsResult, pendingInvitationsResult, unreadAuditResult] = await Promise.all([
      drizzleClientHttp
        .select({ count: count() })
        .from(streams)
        .where(and(eq(streams.organizationId, context.organizationId), eq(streams.status, 'draft'))),
      drizzleClientHttp
        .select({ count: count() })
        .from(employeeInvitations)
        .where(
          and(
            eq(employeeInvitations.organizationId, context.organizationId),
            eq(employeeInvitations.status, 'sent'),
            isNull(employeeInvitations.acceptedAt),
            isNull(employeeInvitations.revokedAt),
          ),
        ),
      drizzleClientHttp
        .select({ count: count() })
        .from(alerts)
        .where(
          and(
            eq(alerts.organizationId, context.organizationId),
            eq(alerts.status, 'open'),
            or(eq(alerts.severity, 'medium'), eq(alerts.severity, 'high'), eq(alerts.severity, 'critical')),
          ),
        ),
    ]);

    return {
      draftStreams: draftStreamsResult[0]?.count ?? 0,
      pendingInvitations: pendingInvitationsResult[0]?.count ?? 0,
      unreadAuditItems: unreadAuditResult[0]?.count ?? 0,
    };
  } catch (error) {
    Sentry.logger.error('Failed to fetch notification counts', {
      error,
      organizationId: context.organizationId,
    });
    console.error('Error fetching notification counts:', error);
    return {
      draftStreams: 0,
      pendingInvitations: 0,
      unreadAuditItems: 0,
    };
  }
}
