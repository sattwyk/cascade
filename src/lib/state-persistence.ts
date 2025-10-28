import { AccountState } from '@/lib/enums';

const ACCOUNT_STATE_KEY = 'cascade_account_state';
const DEMO_MODE_KEY = 'cascade_demo_mode';

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

/**
 * Check if demo mode is enabled
 */
export function isDemoModeEnabled(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return localStorage.getItem(DEMO_MODE_KEY) === 'true';
  } catch (error) {
    console.error('Failed to read demo mode from localStorage:', error);
    return false;
  }
}

/**
 * Enable or disable demo mode
 */
export function setDemoMode(enabled: boolean): void {
  if (typeof window === 'undefined') return;

  try {
    if (enabled) {
      localStorage.setItem(DEMO_MODE_KEY, 'true');
    } else {
      localStorage.removeItem(DEMO_MODE_KEY);
    }
  } catch (error) {
    console.error('Failed to save demo mode to localStorage:', error);
  }
}

/**
 * Reset all saved state (useful for testing)
 */
export function resetAllState(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(ACCOUNT_STATE_KEY);
    localStorage.removeItem(DEMO_MODE_KEY);
  } catch (error) {
    console.error('Failed to reset state:', error);
  }
}
