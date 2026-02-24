import { NextResponse } from 'next/server';

import * as Sentry from '@sentry/nextjs';

type LogLevel = 'info' | 'warn' | 'error';

const DEFAULT_MESSAGE = 'Manual Sentry log health check';
const DEFAULT_SOURCE = 'api/health/sentry-log';
const RATE_LIMIT_WINDOW_MS = 60_000;

const requestBuckets = new Map<string, { count: number; windowStart: number }>();

const isProduction = process.env.NODE_ENV === 'production';

function toFiniteInteger(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const maxRequestsPerMinute = toFiniteInteger(process.env.SENTRY_HEALTHCHECK_MAX_PER_MINUTE, isProduction ? 10 : 60);

export const dynamic = 'force-dynamic';

function normalizeLevel(value: string | null | undefined): LogLevel {
  if (value === 'warn' || value === 'error') {
    return value;
  }

  return 'info';
}

function normalizeMessage(value: string | null | undefined): string {
  const message = value?.trim();
  if (!message || message.length === 0) return DEFAULT_MESSAGE;
  return message.slice(0, 240);
}

function normalizeSource(value: string | null | undefined): string {
  const source = value?.trim();
  return source && source.length > 0 ? source : DEFAULT_SOURCE;
}

function emitStructuredLog(level: LogLevel, message: string, attributes: Record<string, unknown>) {
  if (level === 'error') {
    Sentry.logger.error(message, attributes);
    return;
  }

  if (level === 'warn') {
    Sentry.logger.warn(message, attributes);
    return;
  }

  Sentry.logger.info(message, attributes);
}

function resolveClientIdentifier(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const clientIp = forwardedFor.split(',')[0]?.trim();
    if (clientIp) return clientIp;
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp?.trim()) return realIp.trim();

  return 'unknown';
}

function isRateLimited(clientId: string): boolean {
  const now = Date.now();
  const current = requestBuckets.get(clientId);

  if (!current || now - current.windowStart >= RATE_LIMIT_WINDOW_MS) {
    requestBuckets.set(clientId, { count: 1, windowStart: now });
    return false;
  }

  if (current.count >= maxRequestsPerMinute) {
    return true;
  }

  current.count += 1;
  requestBuckets.set(clientId, current);
  return false;
}

function resolveConfiguredToken(): string | null {
  const configuredToken = process.env.SENTRY_HEALTHCHECK_TOKEN?.trim();
  return configuredToken && configuredToken.length > 0 ? configuredToken : null;
}

function isAuthorizedRequest(request: Request, configuredToken: string): boolean {
  const providedToken = request.headers.get('x-sentry-health-token')?.trim();
  return Boolean(providedToken && providedToken === configuredToken);
}

function buildResponse(level: LogLevel, message: string, source: string, method: 'GET' | 'POST') {
  return NextResponse.json({
    ok: true,
    level,
    message,
    source,
    method,
    timestamp: new Date().toISOString(),
  });
}

export function GET(request: Request) {
  const configuredToken = resolveConfiguredToken();
  if (!configuredToken) {
    return NextResponse.json({ ok: false, error: 'Sentry health logging is disabled.' }, { status: 503 });
  }

  if (!isAuthorizedRequest(request, configuredToken)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  if (isRateLimited(resolveClientIdentifier(request))) {
    return NextResponse.json(
      { ok: false, error: 'Too many requests. Please wait before retrying.' },
      { status: 429, headers: { 'Retry-After': '60' } },
    );
  }

  const { searchParams } = new URL(request.url);
  const level = normalizeLevel(searchParams.get('level'));
  const message = normalizeMessage(searchParams.get('message'));
  const source = normalizeSource(searchParams.get('source'));

  emitStructuredLog(level, message, { source, method: 'GET' });
  return buildResponse(level, message, source, 'GET');
}

export async function POST(request: Request) {
  const configuredToken = resolveConfiguredToken();
  if (!configuredToken) {
    return NextResponse.json({ ok: false, error: 'Sentry health logging is disabled.' }, { status: 503 });
  }

  if (!isAuthorizedRequest(request, configuredToken)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  if (isRateLimited(resolveClientIdentifier(request))) {
    return NextResponse.json(
      { ok: false, error: 'Too many requests. Please wait before retrying.' },
      { status: 429, headers: { 'Retry-After': '60' } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const level = normalizeLevel(
    typeof (body as { level?: unknown } | null)?.level === 'string' ? (body as { level?: string }).level : undefined,
  );
  const message = normalizeMessage(
    typeof (body as { message?: unknown } | null)?.message === 'string'
      ? (body as { message?: string }).message
      : undefined,
  );
  const source = normalizeSource(
    typeof (body as { source?: unknown } | null)?.source === 'string'
      ? (body as { source?: string }).source
      : undefined,
  );

  emitStructuredLog(level, message, { source, method: 'POST' });
  return buildResponse(level, message, source, 'POST');
}
