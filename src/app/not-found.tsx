import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="text-sm text-muted-foreground">The page you requested does not exist or is no longer available.</p>
      <Link href="/" className="text-sm font-medium text-primary hover:underline">
        Return home
      </Link>
    </main>
  );
}
