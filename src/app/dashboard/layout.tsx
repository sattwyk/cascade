'use client';

import { ReactNode, Suspense } from 'react';

import { DashboardProvider } from '@/components/dashboard/dashboard-context';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { EmployeeDashboardProvider } from '@/components/employee-dashboard/employee-dashboard-context';
import { EmployeeDashboardLayout } from '@/components/employee-dashboard/employee-dashboard-layout';

// TODO: Implement actual role detection
function getUserRole(): 'employer' | 'employee' {
  return 'employer';
}

const dashboardFallback = <div className="p-6 text-sm text-muted-foreground">Loading dashboard...</div>;

export default function DashboardLayoutWrapper({
  children,
  employer,
  employee,
}: {
  children: ReactNode;
  employer: ReactNode;
  employee: ReactNode;
}) {
  const role = getUserRole();

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
