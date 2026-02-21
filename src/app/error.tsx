'use client';

import { useEffect } from 'react';

import Link from 'next/link';

import * as Sentry from '@sentry/nextjs';

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function Error({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    Sentry.captureException(error);
    Sentry.logger.error('Root error boundary caught error', { error, digest: error.digest });
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="text-sm text-muted-foreground">
        We could not load this page. Try again, or return to the dashboard.
      </p>
      {error.digest ? <p className="font-mono text-xs text-muted-foreground">Error ID: {error.digest}</p> : null}
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Try again
        </button>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
          Go to dashboard
        </Link>
      </div>
    </main>
  );
}
