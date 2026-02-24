'use client';

import { ReactNode, Suspense } from 'react';

import { EmployeeDashboardLayout } from '@/features/employees/components/employee-dashboard-layout';

const dashboardFallback = <div className="p-6 text-sm text-muted-foreground">Loading dashboard...</div>;

type EmployeeShellProps = {
  children: ReactNode;
};

export function EmployeeShell({ children }: EmployeeShellProps) {
  return (
    <Suspense fallback={dashboardFallback}>
      <EmployeeDashboardLayout>
        <Suspense fallback={dashboardFallback}>{children}</Suspense>
      </EmployeeDashboardLayout>
    </Suspense>
  );
}
