import type { Metadata } from 'next';

import { LandingPage } from '@/components/landing/landing-page';
import { landingPageRefreshFlag } from '@/core/config/flags';

export const metadata: Metadata = {
  title: 'Cascade | Payroll that pays every hour',
  description: 'Cascade helps teams run real-time Solana payroll streams with faster setup and payout visibility.',
};

export default async function Home() {
  const showNewLandingMessaging = await landingPageRefreshFlag();

  return <LandingPage showNewLandingMessaging={showNewLandingMessaging} />;
}
