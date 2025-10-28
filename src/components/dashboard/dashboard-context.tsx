'use client';

import type React from 'react';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { AccountState } from '@/lib/enums';
import { getSavedAccountState, saveAccountState, setDemoMode } from '@/lib/state-persistence';

interface DashboardContextType {
  selectedStreamId: string | null;
  setSelectedStreamId: (id: string | null) => void;
  isCreateStreamModalOpen: boolean;
  setIsCreateStreamModalOpen: (open: boolean) => void;
  isAddEmployeeModalOpen: boolean;
  setIsAddEmployeeModalOpen: (open: boolean) => void;
  isTopUpModalOpen: boolean;
  setIsTopUpModalOpen: (open: boolean) => void;
  isTopUpAccountModalOpen: boolean;
  setIsTopUpAccountModalOpen: (open: boolean) => void;
  isEmergencyWithdrawModalOpen: boolean;
  setIsEmergencyWithdrawModalOpen: (open: boolean) => void;
  isCloseStreamModalOpen: boolean;
  setIsCloseStreamModalOpen: (open: boolean) => void;
  isViewStreamsModalOpen: boolean;
  setIsViewStreamsModalOpen: (open: boolean) => void;
  isEditEmployeeModalOpen: boolean;
  setIsEditEmployeeModalOpen: (open: boolean) => void;
  isArchiveEmployeeModalOpen: boolean;
  setIsArchiveEmployeeModalOpen: (open: boolean) => void;
  selectedEmployeeId: string | null;
  setSelectedEmployeeId: (id: string | null) => void;
  accountState: AccountState;
  setAccountState: (state: AccountState) => void;
  isOnboardingRequired: boolean;
  resetAllModals: () => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [selectedStreamId, setSelectedStreamId] = useState<string | null>(null);
  const [isCreateStreamModalOpen, setIsCreateStreamModalOpen] = useState(false);
  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [isTopUpAccountModalOpen, setIsTopUpAccountModalOpen] = useState(false);
  const [isEmergencyWithdrawModalOpen, setIsEmergencyWithdrawModalOpen] = useState(false);
  const [isCloseStreamModalOpen, setIsCloseStreamModalOpen] = useState(false);
  const [isViewStreamsModalOpen, setIsViewStreamsModalOpen] = useState(false);
  const [isEditEmployeeModalOpen, setIsEditEmployeeModalOpen] = useState(false);
  const [isArchiveEmployeeModalOpen, setIsArchiveEmployeeModalOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  const [accountState, setAccountStateInternal] = useState<AccountState>(() => getSavedAccountState());

  useEffect(() => {
    setDemoMode(true);
  }, []);

  const setAccountState = useCallback((state: AccountState) => {
    setAccountStateInternal(state);
    saveAccountState(state);
  }, []);

  const isOnboardingRequired = accountState === AccountState.NEW_ACCOUNT || accountState === AccountState.ONBOARDING;

  const resetAllModals = () => {
    setIsCreateStreamModalOpen(false);
    setIsAddEmployeeModalOpen(false);
    setIsTopUpModalOpen(false);
    setIsTopUpAccountModalOpen(false);
    setIsEmergencyWithdrawModalOpen(false);
    setIsCloseStreamModalOpen(false);
    setIsViewStreamsModalOpen(false);
    setIsEditEmployeeModalOpen(false);
    setIsArchiveEmployeeModalOpen(false);
  };

  return (
    <DashboardContext.Provider
      value={{
        selectedStreamId,
        setSelectedStreamId,
        isCreateStreamModalOpen,
        setIsCreateStreamModalOpen,
        isAddEmployeeModalOpen,
        setIsAddEmployeeModalOpen,
        isTopUpModalOpen,
        setIsTopUpModalOpen,
        isTopUpAccountModalOpen,
        setIsTopUpAccountModalOpen,
        isEmergencyWithdrawModalOpen,
        setIsEmergencyWithdrawModalOpen,
        isCloseStreamModalOpen,
        setIsCloseStreamModalOpen,
        isViewStreamsModalOpen,
        setIsViewStreamsModalOpen,
        isEditEmployeeModalOpen,
        setIsEditEmployeeModalOpen,
        isArchiveEmployeeModalOpen,
        setIsArchiveEmployeeModalOpen,
        selectedEmployeeId,
        setSelectedEmployeeId,
        accountState,
        setAccountState,
        isOnboardingRequired,
        resetAllModals,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within DashboardProvider');
  }
  return context;
}
