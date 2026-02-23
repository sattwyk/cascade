import { Suspense } from 'react';

import { OnboardingPage } from '@/features/onboarding/components/onboarding-page';
import { DashboardProvider } from '@/features/organization/components/layout/employer-dashboard-context';

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
