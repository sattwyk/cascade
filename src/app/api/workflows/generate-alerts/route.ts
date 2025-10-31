import { NextResponse } from 'next/server';

import { triggerAlertGeneration } from '@/app/dashboard/actions/workflows';

/**
 * API endpoint to manually trigger alert generation workflow
 * POST /api/workflows/generate-alerts
 */
export async function POST() {
  const result = await triggerAlertGeneration();

  if (result.ok) {
    return NextResponse.json({
      success: true,
      message: 'Alert generation workflow started',
      runId: result.runId,
    });
  }

  return NextResponse.json(
    {
      success: false,
      message: 'Failed to start alert generation workflow',
      error: result.error,
    },
    { status: 500 },
  );
}
