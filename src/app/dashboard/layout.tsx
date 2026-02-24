import { ReactNode, Suspense } from 'react';

import { redirect } from 'next/navigation';

import { getUserRole } from '@/core/auth/user-role';
import { AccountState } from '@/core/enums';
import { RoleProvider } from '@/features/organization/components/layout/role-context';
import { resolveOrganizationContext } from '@/features/organization/server/actions/organization-context';

import { DashboardLayoutClient } from './layout.client';

type DashboardLayoutWrapperProps = {
  children: ReactNode;
  employer: ReactNode;
  employee: ReactNode;
};

async function RoleResolver(props: DashboardLayoutWrapperProps) {
  const role = await getUserRole();

  if (role === 'employer') {
    const organizationContext = await resolveOrganizationContext();
    const accountState = organizationContext.status === 'ok' ? organizationContext.accountState : null;
    const needsOnboarding =
      accountState == null || accountState === AccountState.NEW_ACCOUNT || accountState === AccountState.ONBOARDING;

    if (needsOnboarding) {
      redirect('/onboarding');
    }
  }

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
