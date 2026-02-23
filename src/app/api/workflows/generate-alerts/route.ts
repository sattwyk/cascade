import { NextResponse } from 'next/server';

import * as Sentry from '@sentry/nextjs';

import { triggerAlertGeneration } from '@/features/alerts/server/actions/workflows';

/**
 * API endpoint to manually trigger alert generation workflow
 * POST /api/workflows/generate-alerts
 */
export async function POST() {
  Sentry.logger.info('Triggering manual alert generation workflow');
  const result = await triggerAlertGeneration();

  if (result.ok) {
    Sentry.logger.info('Alert generation workflow started successfully', { runId: result.runId });
    return NextResponse.json({
      success: true,
      message: 'Alert generation workflow started',
      runId: result.runId,
    });
  }

  Sentry.logger.error('Failed to start alert generation workflow', { error: result.error });
  return NextResponse.json(
    {
      success: false,
      message: 'Failed to start alert generation workflow',
      error: result.error,
    },
    { status: 500 },
  );
}
