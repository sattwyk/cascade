'use client';

import { createContext, useContext, useMemo, useState } from 'react';

import type { UserRole } from '@/lib/auth/user-role';

type RoleContextValue = {
  role: UserRole;
  setRole: (role: UserRole) => void;
};

const RoleContext = createContext<RoleContextValue | undefined>(undefined);

export function RoleProvider({ initialRole, children }: { initialRole: UserRole; children: React.ReactNode }) {
  const [role, setRole] = useState<UserRole>(initialRole);

  const value = useMemo<RoleContextValue>(() => ({ role, setRole }), [role]);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) {
    throw new Error('useRole must be used within RoleProvider');
  }
  return ctx;
}
