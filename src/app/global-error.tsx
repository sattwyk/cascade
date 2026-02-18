'use client';

import { useEffect } from 'react';

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en" className="light" style={{ colorScheme: 'light' }}>
      <body className="bg-background font-sans text-foreground antialiased">
        <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center gap-4 px-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Application error</h1>
          <p className="text-sm text-muted-foreground">An unexpected error occurred while loading Cascade.</p>
          {error.digest ? <p className="font-mono text-xs text-muted-foreground">Error ID: {error.digest}</p> : null}
          <button
            type="button"
            onClick={() => reset()}
            className="mt-2 inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Retry
          </button>
        </main>
      </body>
    </html>
  );
}
