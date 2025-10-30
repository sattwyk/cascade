'use client';

import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';

import { OnboardingBanner } from './onboarding-banner';
import { StateSwitcher } from './state-switcher';
import { WalletBanner } from './wallet-banner';

export function DashboardHeader() {
  const isMobile = useIsMobile();
  const { isMobile: sidebarIsMobile, open, openMobile } = useSidebar();
  const isExpanded = sidebarIsMobile ? openMobile : open;

  return (
    <header className="border-b border-border bg-card">
      <OnboardingBanner />

      <WalletBanner />

      <div className="flex items-center justify-between px-6 py-3 md:px-8">
        {isMobile && (
          <SidebarTrigger
            className="md:hidden"
            onClick={(event) => {
              event.stopPropagation();
            }}
            aria-expanded={isExpanded}
          />
        )}

        <div className="ml-auto">
          <StateSwitcher />
        </div>
      </div>
    </header>
  );
}
