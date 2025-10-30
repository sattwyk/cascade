'use client';

import { ReactNode, Suspense } from 'react';

import { DashboardProvider } from '@/components/dashboard/dashboard-context';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useRole } from '@/components/dashboard/role-context';
import { EmployeeDashboardProvider } from '@/components/employee-dashboard/employee-dashboard-context';
import { EmployeeDashboardLayout } from '@/components/employee-dashboard/employee-dashboard-layout';

const dashboardFallback = <div className="p-6 text-sm text-muted-foreground">Loading dashboard...</div>;

type DashboardLayoutClientProps = {
  children: ReactNode;
  employer: ReactNode;
  employee: ReactNode;
};

export function DashboardLayoutClient({ children, employer, employee }: DashboardLayoutClientProps) {
  const { role } = useRole();

  if (role === 'employee') {
    return (
      <EmployeeDashboardProvider>
        <Suspense fallback={dashboardFallback}>
          <EmployeeDashboardLayout>
            <Suspense fallback={dashboardFallback}>{employee || children}</Suspense>
          </EmployeeDashboardLayout>
        </Suspense>
      </EmployeeDashboardProvider>
    );
  }

  return (
    <DashboardProvider>
      <Suspense fallback={dashboardFallback}>
        <DashboardLayout>
          <Suspense fallback={dashboardFallback}>{employer || children}</Suspense>
        </DashboardLayout>
      </Suspense>
    </DashboardProvider>
  );
}
