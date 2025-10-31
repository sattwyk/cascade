'use server';

import { start } from 'workflow/api';

import { generateAlertsWorkflow } from '@/workflows/alert-generation';

/**
 * Server action to trigger alert generation workflow
 */
export async function triggerAlertGeneration() {
  try {
    const run = await start(generateAlertsWorkflow, []);
    console.log('Alert generation workflow started:', run.runId);
    return { ok: true, runId: run.runId };
  } catch (error) {
    console.error('Failed to start alert generation workflow:', error);
    return { ok: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
