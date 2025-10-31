'use client';

import type React from 'react';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { getSetupSnapshot, updateAccountState } from '@/app/dashboard/actions/account-state';
import { completeOnboardingTask, type OnboardingTask } from '@/app/dashboard/actions/onboarding-tasks';
import { AccountState } from '@/lib/enums';
import {
  DEFAULT_SETUP_PROGRESS,
  getSavedAccountState,
  getSavedSetupProgress,
  saveAccountState,
  saveSetupProgress,
  type SetupProgress,
} from '@/lib/state-persistence';
import type { EmployeeSummary } from '@/types/employee';

type SetupStep = keyof SetupProgress;

const STEP_TASK_MAP: Partial<Record<SetupStep, OnboardingTask>> = {
  walletConnected: 'connect_wallet',
  tokenAccountFunded: 'treasury_verified',
  employeeAdded: 'employee_added',
  streamCreated: 'first_stream_created',
};

const ACCOUNT_STATE_ORDER: Record<AccountState, number> = {
  [AccountState.NEW_ACCOUNT]: 0,
  [AccountState.ONBOARDING]: 1,
  [AccountState.WALLET_CONNECTED]: 2,
  [AccountState.FIRST_STREAM_CREATED]: 3,
  [AccountState.FULLY_OPERATING]: 4,
};

function deriveProgressFromState(state: AccountState, progress: SetupProgress): SetupProgress {
  const next: SetupProgress = { ...progress };

  if (state !== AccountState.NEW_ACCOUNT && state !== AccountState.ONBOARDING) {
    next.walletConnected = true;
  }

  if (state === AccountState.FIRST_STREAM_CREATED || state === AccountState.FULLY_OPERATING) {
    next.tokenAccountFunded = true;
    next.employeeAdded = true;
    next.streamCreated = true;
  }

  return next;
}

function areProgressEqual(a: SetupProgress, b: SetupProgress): boolean {
  return (
    a.walletConnected === b.walletConnected &&
    a.tokenAccountFunded === b.tokenAccountFunded &&
    a.employeeAdded === b.employeeAdded &&
    a.streamCreated === b.streamCreated
  );
}

function isStateUpgrade(current: AccountState, next: AccountState): boolean {
  return ACCOUNT_STATE_ORDER[next] > ACCOUNT_STATE_ORDER[current];
}

function resolveStateFromProgress(progress: SetupProgress, currentState: AccountState): AccountState {
  if (progress.streamCreated) return AccountState.FIRST_STREAM_CREATED;
  if (progress.employeeAdded || progress.tokenAccountFunded || progress.walletConnected) {
    return AccountState.WALLET_CONNECTED;
  }
  return currentState;
}

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
  selectedEmployee: EmployeeSummary | null;
  setSelectedEmployee: (employee: EmployeeSummary | null) => void;
  accountState: AccountState;
  setAccountState: (state: AccountState) => void;
  isOnboardingRequired: boolean;
  setupProgress: SetupProgress;
  completeSetupStep: (step: SetupStep) => void;
  resetSetupProgress: () => void;
  resetAllModals: () => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const initialAccountState = getSavedAccountState();
  const initialSetupProgress = deriveProgressFromState(initialAccountState, getSavedSetupProgress());

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
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeSummary | null>(null);

  const [accountState, setAccountStateInternal] = useState<AccountState>(initialAccountState);
  const [setupProgress, setSetupProgress] = useState<SetupProgress>(initialSetupProgress);
  const lastPersistedStateRef = useRef<AccountState>(initialAccountState);

  const syncProgressWithState = useCallback((state: AccountState) => {
    setSetupProgress((prev) => {
      const next = deriveProgressFromState(state, prev);
      if (areProgressEqual(prev, next)) return prev;
      saveSetupProgress(next);
      return next;
    });
  }, []);

  const setAccountState = useCallback(
    (state: AccountState) => {
      setAccountStateInternal((prev) => (prev === state ? prev : state));
      saveAccountState(state);
      syncProgressWithState(state);
    },
    [syncProgressWithState],
  );

  const completeSetupStep = useCallback(
    (step: SetupStep) => {
      const newlyCompleted: SetupStep[] = [];

      setSetupProgress((prev) => {
        if (prev[step]) return prev;

        const updated: SetupProgress = { ...prev };

        if (!prev[step]) {
          updated[step] = true;
          newlyCompleted.push(step);
        }

        if (step === 'streamCreated') {
          if (!prev.tokenAccountFunded) {
            updated.tokenAccountFunded = true;
            newlyCompleted.push('tokenAccountFunded');
          }
          if (!prev.employeeAdded) {
            updated.employeeAdded = true;
            newlyCompleted.push('employeeAdded');
          }
        }

        const next = deriveProgressFromState(accountState, updated);
        saveSetupProgress(next);
        const targetState = resolveStateFromProgress(next, accountState);
        if (isStateUpgrade(accountState, targetState)) {
          setAccountState(targetState);
        }
        return next;
      });

      if (newlyCompleted.length > 0) {
        newlyCompleted.forEach((completedStep) => {
          const task = STEP_TASK_MAP[completedStep];
          if (!task) return;
          void completeOnboardingTask(task)
            .then((result) => {
              if (!result.ok && result.reason !== 'database-disabled') {
                console.warn('[dashboard] Onboarding task not recorded', result.reason);
              }
            })
            .catch((error) => {
              console.error('[dashboard] Failed to record onboarding task', error);
            });
        });
      }
    },
    [accountState, setAccountState],
  );

  const resetSetupProgress = useCallback(() => {
    const reset = deriveProgressFromState(accountState, { ...DEFAULT_SETUP_PROGRESS });
    setSetupProgress(reset);
    saveSetupProgress(reset);
  }, [accountState]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const snapshot = await getSetupSnapshot();
        if (cancelled || !snapshot) return;

        const serverProgress = { ...snapshot.progress };

        let mergedProgress: SetupProgress;

        setSetupProgress((prev) => {
          // Merge server progress with local progress, preferring "true" values
          // This prevents server queries from resetting progress that's already completed locally
          const merged: SetupProgress = {
            walletConnected: prev.walletConnected || serverProgress.walletConnected,
            tokenAccountFunded: prev.tokenAccountFunded || serverProgress.tokenAccountFunded,
            employeeAdded: prev.employeeAdded || serverProgress.employeeAdded,
            streamCreated: prev.streamCreated || serverProgress.streamCreated,
          };

          mergedProgress = merged;

          // Log when local state is preserved over server state
          if (process.env.NODE_ENV === 'development') {
            const hadLocalOverride =
              (prev.tokenAccountFunded && !serverProgress.tokenAccountFunded) ||
              (prev.employeeAdded && !serverProgress.employeeAdded) ||
              (prev.streamCreated && !serverProgress.streamCreated);

            if (hadLocalOverride) {
              console.info('[dashboard] Preserved local progress over server state', {
                local: prev,
                server: serverProgress,
                merged,
              });
            }
          }

          if (areProgressEqual(prev, merged)) return prev;
          saveSetupProgress(merged);
          return merged;
        });

        // Use merged progress (not just server progress) to determine state
        const normalizedState = resolveStateFromProgress(mergedProgress!, snapshot.accountState);
        lastPersistedStateRef.current = snapshot.accountState;
        setAccountStateInternal((prev) => {
          // Only update state if it's an upgrade
          if (isStateUpgrade(prev, normalizedState)) {
            saveAccountState(normalizedState);
            return normalizedState;
          }
          return prev;
        });
      } catch (error) {
        console.error('[dashboard] Failed to load setup snapshot', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [syncProgressWithState]);

  useEffect(() => {
    if (!isStateUpgrade(lastPersistedStateRef.current, accountState)) return;

    let cancelled = false;
    void (async () => {
      try {
        const result = await updateAccountState(accountState);
        if (!cancelled && result.updated) {
          lastPersistedStateRef.current = accountState;
        }
      } catch (error) {
        console.error('[dashboard] Failed to persist account state', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accountState]);

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
    setSelectedEmployeeId(null);
    setSelectedEmployee(null);
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
        selectedEmployee,
        setSelectedEmployee,
        accountState,
        setAccountState,
        isOnboardingRequired,
        setupProgress,
        completeSetupStep,
        resetSetupProgress,
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
