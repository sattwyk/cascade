'use client';

import { ReactNode, Suspense } from 'react';

import { DashboardLayout } from '@/features/organization/components/layout/employer-dashboard-layout';

const dashboardFallback = <div className="p-6 text-sm text-muted-foreground">Loading dashboard...</div>;

type EmployerShellProps = {
  children: ReactNode;
};

export function EmployerShell({ children }: EmployerShellProps) {
  return (
    <Suspense fallback={dashboardFallback}>
      <DashboardLayout>
        <Suspense fallback={dashboardFallback}>{children}</Suspense>
      </DashboardLayout>
    </Suspense>
  );
}
