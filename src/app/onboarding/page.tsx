import { Suspense } from 'react';

import { DashboardProvider } from '@/components/dashboard/dashboard-context';
import { OnboardingPage } from '@/components/dashboard/onboarding/onboarding-page';

const fallback = <div className="p-6 text-sm text-muted-foreground">Loading onboarding…</div>;

export default function EmployerOnboardingPage() {
  return (
    <DashboardProvider>
      <Suspense fallback={fallback}>
        <OnboardingPage />
      </Suspense>
    </DashboardProvider>
  );
}
