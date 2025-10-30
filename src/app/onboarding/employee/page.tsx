import Link from 'next/link';

export default function EmployeeOnboardingEntry() {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-2xl flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Check your email invitation
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          To join Cascade as an employee, open the personalized invite link sent to your inbox. Your invite link
          includes a unique onboarding ID and ensures you land on the right workspace.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href="/" className="text-sm font-medium text-primary hover:underline">
          Return to homepage
        </Link>
        <Link href="mailto:support@cascade.sattwyk.com" className="text-sm text-muted-foreground hover:text-foreground">
          Contact support
        </Link>
      </div>
    </div>
  );
}
