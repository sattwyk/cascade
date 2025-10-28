'use client';

import { DashboardProvider } from '@/components/dashboard/dashboard-context';
import { OnboardingPage } from '@/components/dashboard/onboarding/onboarding-page';

export default function OnboardingRoute() {
  return (
    <DashboardProvider>
      <OnboardingPage />
    </DashboardProvider>
  );
}
