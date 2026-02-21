// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

const isProduction = process.env.NODE_ENV === 'production';

function toFiniteNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const tracesSampleRate = toFiniteNumber(process.env.SENTRY_TRACES_SAMPLE_RATE, isProduction ? 0.2 : 1);
const consoleLevels: Array<'log' | 'warn' | 'error'> = isProduction ? ['warn', 'error'] : ['log', 'warn', 'error'];

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: process.env.SENTRY_SEND_DEFAULT_PII === 'true',

  // Optional: capture console logs
  integrations: [Sentry.consoleLoggingIntegration({ levels: consoleLevels })],
});
