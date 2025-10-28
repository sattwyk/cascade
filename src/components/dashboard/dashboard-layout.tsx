'use client';

import type React from 'react';
import { useEffect } from 'react';

import { usePathname, useRouter } from 'next/navigation';

import { AppSidebar } from '@/components/dashboard/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';

import { useDashboard } from './dashboard-context';
import { DashboardHeader } from './header/dashboard-header';
import { AddEmployeeModal } from './modals/add-employee-modal';
import { ArchiveEmployeeModal } from './modals/archive-employee-modal';
import { CloseStreamModal } from './modals/close-stream-modal';
import { CreateStreamModal } from './modals/create-stream-modal';
import { EditEmployeeModal } from './modals/edit-employee-modal';
import { EmergencyWithdrawModal } from './modals/emergency-withdraw-modal';
import { TopUpAccountModal } from './modals/top-up-account-modal';
import { TopUpStreamModal } from './modals/top-up-stream-modal';
import { ViewStreamsModal } from './modals/view-streams-modal';
import { DashboardRightRail } from './right-rail/dashboard-right-rail';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isMobile = useIsMobile();

  const {
    isCreateStreamModalOpen,
    setIsCreateStreamModalOpen,
    isAddEmployeeModalOpen,
    setIsAddEmployeeModalOpen,
    isTopUpModalOpen,
    setIsTopUpModalOpen,
    isEmergencyWithdrawModalOpen,
    setIsEmergencyWithdrawModalOpen,
    isCloseStreamModalOpen,
    setIsCloseStreamModalOpen,
    isViewStreamsModalOpen,
    setIsViewStreamsModalOpen,
    isEditEmployeeModalOpen,
    setIsEditEmployeeModalOpen,
    isArchiveEmployeeModalOpen,
    setIsArchiveEmployeeModalOpen,
    selectedEmployeeId,
    isOnboardingRequired,
  } = useDashboard();

  const isRedirectingToOnboarding = isOnboardingRequired && pathname !== '/onboarding';
  const isRedirectingToDashboard = !isOnboardingRequired && pathname === '/onboarding';

  useEffect(() => {
    if (isRedirectingToOnboarding) {
      router.replace('/onboarding');
    } else if (isRedirectingToDashboard) {
      router.replace('/dashboard');
    }
  }, [isRedirectingToDashboard, isRedirectingToOnboarding, router]);

  if (isRedirectingToOnboarding || isRedirectingToDashboard) {
    return null;
  }

  return (
    <SidebarProvider defaultOpen>
      <AppSidebar />

      <SidebarInset className="bg-background">
        <div className="flex min-h-svh flex-col">
          <DashboardHeader />

          <div className="flex flex-1 overflow-hidden">
            <main className="flex-1 overflow-auto">
              <div className="p-4 sm:p-5 md:p-6 lg:p-8">{children}</div>
            </main>

            {!isMobile && (
              <aside className="sticky top-0 hidden max-h-screen w-64 shrink-0 self-start overflow-y-auto border-l border-border bg-card lg:block xl:w-80">
                <DashboardRightRail />
              </aside>
            )}
          </div>
        </div>
      </SidebarInset>

      <CreateStreamModal isOpen={isCreateStreamModalOpen} onClose={() => setIsCreateStreamModalOpen(false)} />
      <AddEmployeeModal isOpen={isAddEmployeeModalOpen} onClose={() => setIsAddEmployeeModalOpen(false)} />
      <TopUpAccountModal isOpen={isTopUpModalOpen} onClose={() => setIsTopUpModalOpen(false)} />
      <TopUpStreamModal isOpen={isEmergencyWithdrawModalOpen} onClose={() => setIsEmergencyWithdrawModalOpen(false)} />
      <EmergencyWithdrawModal
        isOpen={isEmergencyWithdrawModalOpen}
        onClose={() => setIsEmergencyWithdrawModalOpen(false)}
      />
      <CloseStreamModal isOpen={isCloseStreamModalOpen} onClose={() => setIsCloseStreamModalOpen(false)} />

      <ViewStreamsModal
        isOpen={isViewStreamsModalOpen}
        onClose={() => setIsViewStreamsModalOpen(false)}
        employeeName={selectedEmployeeId ? 'Alice Johnson' : ''}
      />
      <EditEmployeeModal
        isOpen={isEditEmployeeModalOpen}
        onClose={() => setIsEditEmployeeModalOpen(false)}
        employeeId={selectedEmployeeId || ''}
      />
      <ArchiveEmployeeModal
        isOpen={isArchiveEmployeeModalOpen}
        onClose={() => setIsArchiveEmployeeModalOpen(false)}
        employeeId={selectedEmployeeId || ''}
        employeeName={selectedEmployeeId ? 'Alice Johnson' : ''}
      />
    </SidebarProvider>
  );
}
