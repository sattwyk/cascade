import { differenceInHours, parseISO } from 'date-fns';
import { FatalError } from 'workflow';

import { createAlert, type CreateAlertInput } from '@/features/alerts/server/actions/alerts';
import { getDashboardStreams } from '@/features/streams/server/actions/employer-streams';
import type { DashboardStream } from '@/types/stream';

export type AlertGenerationResult = {
  ok: boolean;
  alertsCreated: number;
  alertsChecked: number;
};

/**
 * Workflow to check all streams and generate alerts for issues
 */
export async function generateAlertsWorkflow(): Promise<AlertGenerationResult> {
  'use workflow';

  const streams = await fetchAllStreams();

  if (streams.length === 0) {
    return { ok: true, alertsCreated: 0, alertsChecked: 0 };
  }

  const alertsToCreate: CreateAlertInput[] = [];

  // Check each stream for alert conditions
  for (const stream of streams) {
    // 1. Low Runway Alert (< 72 hours)
    if (stream.hourlyRate > 0 && stream.status === 'active') {
      const runwayHours = stream.vaultBalance / stream.hourlyRate;
      if (Number.isFinite(runwayHours) && runwayHours > 0 && runwayHours <= 72) {
        const severity = runwayHours <= 24 ? 'critical' : runwayHours <= 48 ? 'high' : 'medium';
        alertsToCreate.push({
          type: 'low_runway',
          severity,
          title: 'Low runway warning',
          description: `Stream for ${getEmployeeName(stream)} has only ${Math.round(runwayHours)} hours of funding remaining.`,
          streamId: stream.id,
          employeeId: stream.employeeId ?? undefined,
          metadata: {
            runwayHours,
            vaultBalance: stream.vaultBalance,
            hourlyRate: stream.hourlyRate,
            streamAddress: stream.streamAddress,
          },
        });
      }
    }

    // 2. Inactivity Alert (25+ days)
    if (stream.lastActivityAt && stream.status === 'active') {
      try {
        const hoursSinceActivity = differenceInHours(new Date(), parseISO(stream.lastActivityAt));
        if (hoursSinceActivity >= 24 * 25) {
          alertsToCreate.push({
            type: 'inactivity',
            severity: 'high',
            title: 'Stream inactive',
            description: `Stream for ${getEmployeeName(stream)} has been inactive for ${Math.round(hoursSinceActivity / 24)} days.`,
            streamId: stream.id,
            employeeId: stream.employeeId ?? undefined,
            metadata: {
              hoursSinceActivity,
              lastActivityAt: stream.lastActivityAt,
              streamAddress: stream.streamAddress,
            },
          });
        }
      } catch (error) {
        console.warn('Failed to parse lastActivityAt for stream', stream.id, error);
      }
    }

    // 3. Suspended Stream Alert
    if (stream.status === 'suspended') {
      alertsToCreate.push({
        type: 'suspended_stream',
        severity: 'medium',
        title: 'Stream suspended',
        description: `Payment stream for ${getEmployeeName(stream)} is currently suspended.`,
        streamId: stream.id,
        employeeId: stream.employeeId ?? undefined,
        metadata: {
          streamAddress: stream.streamAddress,
          suspendedAt: stream.deactivatedAt,
        },
      });
    }

    // 4. Token Account Alert (vault balance is 0 but stream is active)
    if (stream.vaultBalance === 0 && stream.status === 'active') {
      alertsToCreate.push({
        type: 'token_account',
        severity: 'critical',
        title: 'Empty vault',
        description: `Stream for ${getEmployeeName(stream)} has zero balance. Top up immediately.`,
        streamId: stream.id,
        employeeId: stream.employeeId ?? undefined,
        metadata: {
          streamAddress: stream.streamAddress,
          vaultAddress: stream.vaultAddress,
        },
      });
    }
  }

  // Create all alerts in parallel (duplicates will be skipped)
  const alertResults = await Promise.all(alertsToCreate.map((alertInput) => createAlertStep(alertInput)));

  // Count successful non-duplicate alerts
  const alertsCreated = alertResults.filter((result) => result.ok && !result.duplicate).length;

  return { ok: true, alertsCreated, alertsChecked: alertsToCreate.length };
}

/**
 * Step function to fetch all dashboard streams
 */
async function fetchAllStreams(): Promise<DashboardStream[]> {
  'use step';

  try {
    const streams = await getDashboardStreams();
    return streams;
  } catch (error) {
    console.error('Failed to fetch dashboard streams:', error);
    throw new FatalError('Failed to fetch dashboard streams');
  }
}

/**
 * Step function to create an alert
 */
async function createAlertStep(alertInput: CreateAlertInput) {
  'use step';

  try {
    const result = await createAlert(alertInput);
    return result;
  } catch (error) {
    console.error('Failed to create alert:', error);
    // Don't throw - we want to continue creating other alerts
    return { ok: false, duplicate: false };
  }
}

/**
 * Helper function to get employee name from stream
 */
function getEmployeeName(stream: DashboardStream): string {
  return stream.employeeName || 'Unknown Employee';
}
