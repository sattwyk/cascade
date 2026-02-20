'use client';

import { ReactNode } from 'react';

import dynamic from 'next/dynamic';

import { DashboardProvider } from '@/components/dashboard/dashboard-context';
import { useRole } from '@/components/dashboard/role-context';
import { EmployeeDashboardProvider } from '@/components/employee-dashboard/employee-dashboard-context';

const dashboardFallback = <div className="p-6 text-sm text-muted-foreground">Loading dashboard...</div>;

const EmployerShell = dynamic(() => import('./shells/employer-shell').then((mod) => mod.EmployerShell), {
  loading: () => dashboardFallback,
});

const EmployeeShell = dynamic(() => import('./shells/employee-shell').then((mod) => mod.EmployeeShell), {
  loading: () => dashboardFallback,
});

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
        <EmployeeShell>{employee || children}</EmployeeShell>
      </EmployeeDashboardProvider>
    );
  }

  return (
    <DashboardProvider>
      <EmployerShell>{employer || children}</EmployerShell>
    </DashboardProvider>
  );
}
