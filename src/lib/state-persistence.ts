import { AccountState } from '@/lib/enums';

const ACCOUNT_STATE_KEY = 'cascade_account_state';
const SETUP_PROGRESS_KEY = 'cascade_setup_progress';

export type SetupProgress = {
  walletConnected: boolean;
  tokenAccountFunded: boolean;
  employeeAdded: boolean;
  streamCreated: boolean;
};

export const DEFAULT_SETUP_PROGRESS: SetupProgress = {
  walletConnected: false,
  tokenAccountFunded: false,
  employeeAdded: false,
  streamCreated: false,
};

function isSetupProgress(value: unknown): value is SetupProgress {
  if (!value || typeof value !== 'object') return false;
  const progress = value as Partial<SetupProgress>;
  return (
    typeof progress.walletConnected === 'boolean' &&
    typeof progress.tokenAccountFunded === 'boolean' &&
    typeof progress.employeeAdded === 'boolean' &&
    typeof progress.streamCreated === 'boolean'
  );
}

/**
 * Get the saved account state from localStorage
 * Falls back to NEW_ACCOUNT if nothing is saved
 */
export function getSavedAccountState(): AccountState {
  if (typeof window === 'undefined') {
    return AccountState.NEW_ACCOUNT;
  }

  try {
    const saved = localStorage.getItem(ACCOUNT_STATE_KEY);
    if (saved && Object.values(AccountState).includes(saved as AccountState)) {
      return saved as AccountState;
    }
  } catch (error) {
    console.error('Failed to read account state from localStorage:', error);
  }

  return AccountState.NEW_ACCOUNT;
}

/**
 * Save the account state to localStorage
 */
export function saveAccountState(state: AccountState): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(ACCOUNT_STATE_KEY, state);
  } catch (error) {
    console.error('Failed to save account state to localStorage:', error);
  }
}

export function getSavedSetupProgress(): SetupProgress {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_SETUP_PROGRESS };
  }

  try {
    const saved = localStorage.getItem(SETUP_PROGRESS_KEY);
    if (!saved) return { ...DEFAULT_SETUP_PROGRESS };
    const parsed = JSON.parse(saved);
    if (isSetupProgress(parsed)) {
      return parsed;
    }
  } catch (error) {
    console.error('Failed to read setup progress from localStorage:', error);
  }

  return { ...DEFAULT_SETUP_PROGRESS };
}

export function saveSetupProgress(progress: SetupProgress): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(SETUP_PROGRESS_KEY, JSON.stringify(progress));
  } catch (error) {
    console.error('Failed to save setup progress to localStorage:', error);
  }
}

/**
 * Reset all saved state (useful for testing)
 */
export function resetAllState(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(ACCOUNT_STATE_KEY);
    localStorage.removeItem(SETUP_PROGRESS_KEY);
  } catch (error) {
    console.error('Failed to reset state:', error);
  }
}
