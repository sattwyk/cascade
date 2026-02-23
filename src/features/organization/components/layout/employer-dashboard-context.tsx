'use client';

import type React from 'react';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { AccountState } from '@/core/enums';
import {
  DEFAULT_SETUP_PROGRESS,
  getSavedAccountState,
  getSavedSetupProgress,
  saveAccountState,
  saveSetupProgress,
  type SetupProgress,
} from '@/core/state-persistence';
import { completeOnboardingTask, type OnboardingTask } from '@/features/onboarding/server/actions/onboarding-tasks';
import { getSetupSnapshot, updateAccountState } from '@/features/organization/server/actions/account-state';
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

export type DashboardModalState =
  | { type: 'none' }
  | { type: 'create-stream'; employeeId?: string }
  | { type: 'add-employee' }
  | { type: 'top-up-account' }
  | { type: 'top-up-stream'; streamId: string }
  | { type: 'emergency-withdraw'; streamId: string }
  | { type: 'close-stream'; streamId: string }
  | { type: 'view-streams'; employee: EmployeeSummary }
  | { type: 'edit-employee'; employee: EmployeeSummary }
  | { type: 'archive-employee'; employee: EmployeeSummary };

interface DashboardContextType {
  selectedStreamId: string | null;
  setSelectedStreamId: (id: string | null) => void;
  activeModal: DashboardModalState;
  isModalOpen: boolean;
  openCreateStreamModal: (options?: { employeeId?: string }) => void;
  openAddEmployeeModal: () => void;
  openTopUpAccountModal: () => void;
  openTopUpStreamModal: (streamId: string) => void;
  openEmergencyWithdrawModal: (streamId: string) => void;
  openCloseStreamModal: (streamId: string) => void;
  openViewStreamsModal: (employee: EmployeeSummary) => void;
  openEditEmployeeModal: (employee: EmployeeSummary) => void;
  openArchiveEmployeeModal: (employee: EmployeeSummary) => void;
  closeModal: () => void;
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
  const [activeModal, setActiveModal] = useState<DashboardModalState>({ type: 'none' });

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

    void getSetupSnapshot()
      .then((snapshot) => {
        if (cancelled || !snapshot) return;

        const serverProgress = { ...snapshot.progress };

        let mergedProgress: SetupProgress | null = null;

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
        const normalizedState = resolveStateFromProgress(mergedProgress ?? serverProgress, snapshot.accountState);
        lastPersistedStateRef.current = snapshot.accountState;
        setAccountStateInternal((prev) => {
          // Only update state if it's an upgrade
          if (isStateUpgrade(prev, normalizedState)) {
            saveAccountState(normalizedState);
            return normalizedState;
          }
          return prev;
        });
      })
      .catch((error) => {
        console.error('[dashboard] Failed to load setup snapshot', error);
      });

    return () => {
      cancelled = true;
    };
  }, [syncProgressWithState]);

  useEffect(() => {
    if (!isStateUpgrade(lastPersistedStateRef.current, accountState)) return;

    let cancelled = false;
    void updateAccountState(accountState)
      .then((result) => {
        if (!cancelled && result.updated) {
          lastPersistedStateRef.current = accountState;
        }
      })
      .catch((error) => {
        console.error('[dashboard] Failed to persist account state', error);
      });

    return () => {
      cancelled = true;
    };
  }, [accountState]);

  const isOnboardingRequired = accountState === AccountState.NEW_ACCOUNT || accountState === AccountState.ONBOARDING;

  const closeModal = useCallback(() => {
    setActiveModal({ type: 'none' });
  }, []);

  const openCreateStreamModal = useCallback((options?: { employeeId?: string }) => {
    setActiveModal({ type: 'create-stream', employeeId: options?.employeeId });
  }, []);

  const openAddEmployeeModal = useCallback(() => {
    setActiveModal({ type: 'add-employee' });
  }, []);

  const openTopUpAccountModal = useCallback(() => {
    setActiveModal({ type: 'top-up-account' });
  }, []);

  const openTopUpStreamModal = useCallback((streamId: string) => {
    setSelectedStreamId(streamId);
    setActiveModal({ type: 'top-up-stream', streamId });
  }, []);

  const openEmergencyWithdrawModal = useCallback((streamId: string) => {
    setSelectedStreamId(streamId);
    setActiveModal({ type: 'emergency-withdraw', streamId });
  }, []);

  const openCloseStreamModal = useCallback((streamId: string) => {
    setSelectedStreamId(streamId);
    setActiveModal({ type: 'close-stream', streamId });
  }, []);

  const openViewStreamsModal = useCallback((employee: EmployeeSummary) => {
    setActiveModal({ type: 'view-streams', employee });
  }, []);

  const openEditEmployeeModal = useCallback((employee: EmployeeSummary) => {
    setActiveModal({ type: 'edit-employee', employee });
  }, []);

  const openArchiveEmployeeModal = useCallback((employee: EmployeeSummary) => {
    setActiveModal({ type: 'archive-employee', employee });
  }, []);

  const resetAllModals = closeModal;

  return (
    <DashboardContext.Provider
      value={{
        selectedStreamId,
        setSelectedStreamId,
        activeModal,
        isModalOpen: activeModal.type !== 'none',
        openCreateStreamModal,
        openAddEmployeeModal,
        openTopUpAccountModal,
        openTopUpStreamModal,
        openEmergencyWithdrawModal,
        openCloseStreamModal,
        openViewStreamsModal,
        openEditEmployeeModal,
        openArchiveEmployeeModal,
        closeModal,
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
