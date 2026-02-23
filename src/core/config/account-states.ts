import { AccountState } from '@/core/enums';

/**
 * Account State Configuration
 *
 * This file defines all possible account states and their properties.
 * Each state determines what UI elements and features are visible to the employer.
 *
 * States progression:
 * NEW_ACCOUNT → ONBOARDING → WALLET_CONNECTED → FIRST_STREAM_CREATED → FULLY_OPERATING
 */

export interface AccountStateConfig {
  state: AccountState;
  label: string;
  description: string;
  showOnboarding: boolean;
  showMetrics: boolean;
  showActivityTimeline: boolean;
  showAlerts: boolean;
  showSecondaryMetrics: boolean;
  showStreamsTab: boolean;
  showEmployeesTab: boolean;
  showTokenAccountsTab: boolean;
  showTemplatesTab: boolean;
  showReportsTab: boolean;
  showActivityLogTab: boolean;
  showAuditTrailTab: boolean;
  hasStreams: boolean;
  setupComplete: boolean;
}

export const ACCOUNT_STATE_CONFIG: Record<AccountState, AccountStateConfig> = {
  [AccountState.NEW_ACCOUNT]: {
    state: AccountState.NEW_ACCOUNT,
    label: 'New Account',
    description: 'Fresh account, no setup started',
    showOnboarding: true,
    showMetrics: false,
    showActivityTimeline: false,
    showAlerts: false,
    showSecondaryMetrics: false,
    showStreamsTab: false,
    showEmployeesTab: false,
    showTokenAccountsTab: false,
    showTemplatesTab: false,
    showReportsTab: false,
    showActivityLogTab: false,
    showAuditTrailTab: false,
    hasStreams: false,
    setupComplete: false,
  },
  [AccountState.ONBOARDING]: {
    state: AccountState.ONBOARDING,
    label: 'Onboarding',
    description: 'User is in the onboarding wizard',
    showOnboarding: true,
    showMetrics: false,
    showActivityTimeline: false,
    showAlerts: false,
    showSecondaryMetrics: false,
    showStreamsTab: false,
    showEmployeesTab: false,
    showTokenAccountsTab: false,
    showTemplatesTab: false,
    showReportsTab: false,
    showActivityLogTab: false,
    showAuditTrailTab: false,
    hasStreams: false,
    setupComplete: false,
  },
  [AccountState.WALLET_CONNECTED]: {
    state: AccountState.WALLET_CONNECTED,
    label: 'Wallet Connected',
    description: 'Wallet is connected, ready to create first stream',
    showOnboarding: false,
    showMetrics: false,
    showActivityTimeline: false,
    showAlerts: false,
    showSecondaryMetrics: false,
    showStreamsTab: true,
    showEmployeesTab: true,
    showTokenAccountsTab: true,
    showTemplatesTab: false,
    showReportsTab: false,
    showActivityLogTab: true,
    showAuditTrailTab: true,
    hasStreams: false,
    setupComplete: false,
  },
  [AccountState.FIRST_STREAM_CREATED]: {
    state: AccountState.FIRST_STREAM_CREATED,
    label: 'First Stream Created',
    description: 'First payment stream has been created',
    showOnboarding: false,
    showMetrics: true,
    showActivityTimeline: true,
    showAlerts: true,
    showSecondaryMetrics: true,
    showStreamsTab: true,
    showEmployeesTab: true,
    showTokenAccountsTab: true,
    showTemplatesTab: true,
    showReportsTab: false,
    showActivityLogTab: true,
    showAuditTrailTab: true,
    hasStreams: true,
    setupComplete: true,
  },
  [AccountState.FULLY_OPERATING]: {
    state: AccountState.FULLY_OPERATING,
    label: 'Fully Operating',
    description: 'Account is fully operational with all features enabled',
    showOnboarding: false,
    showMetrics: true,
    showActivityTimeline: true,
    showAlerts: true,
    showSecondaryMetrics: true,
    showStreamsTab: true,
    showEmployeesTab: true,
    showTokenAccountsTab: true,
    showTemplatesTab: true,
    showReportsTab: true,
    showActivityLogTab: true,
    showAuditTrailTab: true,
    hasStreams: true,
    setupComplete: true,
  },
};

/**
 * Get the configuration for a specific account state
 */
export function getAccountStateConfig(state: AccountState): AccountStateConfig {
  return ACCOUNT_STATE_CONFIG[state];
}

/**
 * Get all available account states for UI selection
 */
export function getAllAccountStates(): AccountStateConfig[] {
  return Object.values(ACCOUNT_STATE_CONFIG);
}
