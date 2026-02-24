'use client';

import { ReactNode } from 'react';

import dynamic from 'next/dynamic';

import { EmployeeDashboardProvider } from '@/features/employees/components/employee-dashboard-context';
import { DashboardProvider } from '@/features/organization/components/layout/employer-dashboard-context';
import { useRole } from '@/features/organization/components/layout/role-context';

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
