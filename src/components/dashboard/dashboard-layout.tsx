'use client';

import type React from 'react';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

import { AppSidebar } from '@/components/dashboard/app-sidebar';
import { useSolana } from '@/components/solana/use-solana';
import { Button } from '@/components/ui/button';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';

import { useDashboard } from './dashboard-context';
import { DashboardHeader } from './header/dashboard-header';
import { DashboardRightRail } from './right-rail/dashboard-right-rail';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const AddEmployeeModal = dynamic(() => import('./modals/add-employee-modal').then((mod) => mod.AddEmployeeModal), {
  loading: () => null,
  ssr: false,
});
const ArchiveEmployeeModal = dynamic(
  () => import('./modals/archive-employee-modal').then((mod) => mod.ArchiveEmployeeModal),
  { loading: () => null, ssr: false },
);
const CloseStreamModal = dynamic(() => import('./modals/close-stream-modal').then((mod) => mod.CloseStreamModal), {
  loading: () => null,
  ssr: false,
});
const CreateStreamModal = dynamic(() => import('./modals/create-stream-modal').then((mod) => mod.CreateStreamModal), {
  loading: () => null,
  ssr: false,
});
const EditEmployeeModal = dynamic(() => import('./modals/edit-employee-modal').then((mod) => mod.EditEmployeeModal), {
  loading: () => null,
  ssr: false,
});
const EmergencyWithdrawModal = dynamic(
  () => import('./modals/emergency-withdraw-modal').then((mod) => mod.EmergencyWithdrawModal),
  { loading: () => null, ssr: false },
);
const TopUpAccountModal = dynamic(() => import('./modals/top-up-account-modal').then((mod) => mod.TopUpAccountModal), {
  loading: () => null,
  ssr: false,
});
const TopUpStreamModal = dynamic(() => import('./modals/top-up-stream-modal').then((mod) => mod.TopUpStreamModal), {
  loading: () => null,
  ssr: false,
});
const ViewStreamsModal = dynamic(() => import('./modals/view-streams-modal').then((mod) => mod.ViewStreamsModal), {
  loading: () => null,
  ssr: false,
});

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const { account, connected } = useSolana();

  const { activeModal, closeModal } = useDashboard();

  if (!connected || !account) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background p-6">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-center shadow-sm">
          <h2 className="text-xl font-semibold">Wallet disconnected</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Connect your employer wallet from the landing page to access the dashboard.
          </p>
          <Button className="mt-4" onClick={() => router.push('/')}>
            Return to landing
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen>
      <AppSidebar />

      <SidebarInset className="bg-background">
        <div className="flex h-svh flex-col">
          <DashboardHeader />

          <div className="flex flex-1 overflow-hidden">
            <main className="flex-1 overflow-y-auto">
              <div className="p-4 sm:p-5 md:p-6 lg:p-8">{children}</div>
            </main>

            {!isMobile && (
              <aside className="hidden h-full w-64 shrink-0 overflow-y-auto border-l border-border bg-card lg:block xl:w-80">
                <DashboardRightRail />
              </aside>
            )}
          </div>
        </div>
      </SidebarInset>

      {activeModal.type === 'create-stream' ? (
        <CreateStreamModal isOpen onClose={closeModal} initialEmployeeId={activeModal.employeeId} />
      ) : null}
      {activeModal.type === 'add-employee' ? <AddEmployeeModal isOpen onClose={closeModal} /> : null}
      {activeModal.type === 'top-up-account' ? <TopUpAccountModal isOpen onClose={closeModal} /> : null}
      {activeModal.type === 'top-up-stream' ? (
        <TopUpStreamModal isOpen onClose={closeModal} streamId={activeModal.streamId} />
      ) : null}
      {activeModal.type === 'emergency-withdraw' ? (
        <EmergencyWithdrawModal isOpen onClose={closeModal} streamId={activeModal.streamId} />
      ) : null}
      {activeModal.type === 'close-stream' ? (
        <CloseStreamModal isOpen onClose={closeModal} streamId={activeModal.streamId} />
      ) : null}
      {activeModal.type === 'view-streams' ? (
        <ViewStreamsModal
          isOpen
          onClose={closeModal}
          employeeName={activeModal.employee.name}
          employeeId={activeModal.employee.id}
        />
      ) : null}
      {activeModal.type === 'edit-employee' ? (
        <EditEmployeeModal
          isOpen
          onClose={closeModal}
          employeeId={activeModal.employee.id}
          employee={activeModal.employee}
        />
      ) : null}
      {activeModal.type === 'archive-employee' ? (
        <ArchiveEmployeeModal
          isOpen
          onClose={closeModal}
          employeeId={activeModal.employee.id}
          employeeName={activeModal.employee.name}
        />
      ) : null}
    </SidebarProvider>
  );
}
