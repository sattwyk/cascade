'use client';

import { createContext, ReactNode, useCallback, useContext, useState } from 'react';

interface EmployeeDashboardContextType {
  selectedStreamId: string | null;
  setSelectedStreamId: (id: string | null) => void;
  isWithdrawing: boolean;
  setIsWithdrawing: (value: boolean) => void;
  isRefreshingActivity: boolean;
  setIsRefreshingActivity: (value: boolean) => void;
  refreshActivityHandler: (() => Promise<void>) | null;
  setRefreshActivityHandler: (handler: (() => Promise<void>) | null) => void;
  refreshTrigger: number;
  triggerRefresh: () => void;
}

const EmployeeDashboardContext = createContext<EmployeeDashboardContextType | undefined>(undefined);

export function EmployeeDashboardProvider({ children }: { children: ReactNode }) {
  const [selectedStreamId, setSelectedStreamId] = useState<string | null>(null);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isRefreshingActivity, setIsRefreshingActivity] = useState(false);
  const [refreshActivityHandler, setRefreshActivityHandlerState] = useState<(() => Promise<void>) | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const setRefreshActivityHandler = useCallback((handler: (() => Promise<void>) | null) => {
    setRefreshActivityHandlerState(() => handler);
  }, []);

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  return (
    <EmployeeDashboardContext.Provider
      value={{
        selectedStreamId,
        setSelectedStreamId,
        isWithdrawing,
        setIsWithdrawing,
        isRefreshingActivity,
        setIsRefreshingActivity,
        refreshActivityHandler,
        setRefreshActivityHandler,
        refreshTrigger,
        triggerRefresh,
      }}
    >
      {children}
    </EmployeeDashboardContext.Provider>
  );
}

export function useEmployeeDashboard() {
  const context = useContext(EmployeeDashboardContext);
  if (!context) {
    throw new Error('useEmployeeDashboard must be used within EmployeeDashboardProvider');
  }
  return context;
}
