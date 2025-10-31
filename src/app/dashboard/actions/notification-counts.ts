'use server';

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
    // Count draft streams
    const draftStreamsResult = await drizzleClientHttp
      .select({ count: count() })
      .from(streams)
      .where(and(eq(streams.organizationId, context.organizationId), eq(streams.status, 'draft')));

    // Count pending invitations (sent but not accepted/revoked)
    const pendingInvitationsResult = await drizzleClientHttp
      .select({ count: count() })
      .from(employeeInvitations)
      .where(
        and(
          eq(employeeInvitations.organizationId, context.organizationId),
          eq(employeeInvitations.status, 'sent'),
          isNull(employeeInvitations.acceptedAt),
          isNull(employeeInvitations.revokedAt),
        ),
      );

    // Count open alerts that need attention (medium, high, or critical severity)
    const unreadAuditResult = await drizzleClientHttp
      .select({ count: count() })
      .from(alerts)
      .where(
        and(
          eq(alerts.organizationId, context.organizationId),
          eq(alerts.status, 'open'),
          or(eq(alerts.severity, 'medium'), eq(alerts.severity, 'high'), eq(alerts.severity, 'critical')),
        ),
      );

    return {
      draftStreams: draftStreamsResult[0]?.count ?? 0,
      pendingInvitations: pendingInvitationsResult[0]?.count ?? 0,
      unreadAuditItems: unreadAuditResult[0]?.count ?? 0,
    };
  } catch (error) {
    console.error('Error fetching notification counts:', error);
    return {
      draftStreams: 0,
      pendingInvitations: 0,
      unreadAuditItems: 0,
    };
  }
}
