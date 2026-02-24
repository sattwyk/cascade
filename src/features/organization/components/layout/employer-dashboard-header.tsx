'use client';

import { useIsMobile } from '@/core/hooks/use-mobile';
import { SidebarTrigger, useSidebar } from '@/core/ui/sidebar';
import { WalletBanner } from '@/features/account/components/wallet-banner';
import { OnboardingBanner } from '@/features/onboarding/components/employer-onboarding-banner';

export function DashboardHeader() {
  const isMobile = useIsMobile();
  const { isMobile: sidebarIsMobile, open, openMobile } = useSidebar();
  const isExpanded = sidebarIsMobile ? openMobile : open;

  return (
    <header className="border-b border-border bg-card">
      <OnboardingBanner />

      <WalletBanner />

      <div className="flex items-center justify-between px-6 md:px-8">
        {isMobile && (
          <SidebarTrigger
            className="md:hidden"
            onClick={(event) => {
              event.stopPropagation();
            }}
            aria-expanded={isExpanded}
          />
        )}

        {/* <div className="ml-auto">
          <StateSwitcher />
        </div> */}
      </div>
    </header>
  );
}
