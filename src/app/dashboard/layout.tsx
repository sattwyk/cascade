import { ReactNode, Suspense } from 'react';

import { RoleProvider } from '@/components/dashboard/role-context';
import { getUserRole } from '@/lib/auth/user-role';

import { DashboardLayoutClient } from './layout.client';

type DashboardLayoutWrapperProps = {
  children: ReactNode;
  employer: ReactNode;
  employee: ReactNode;
};

async function RoleResolver(props: DashboardLayoutWrapperProps) {
  const role = await getUserRole();
  return (
    <RoleProvider initialRole={role}>
      <DashboardLayoutClient {...props} />
    </RoleProvider>
  );
}

export default function DashboardLayoutWrapper(props: DashboardLayoutWrapperProps) {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      {/* With Cache Components, dynamic content (cookies/headers) must be wrapped in Suspense */}
      <RoleResolver {...props} />
    </Suspense>
  );
}
