'use server';

import { and, count, eq, gt, ne } from 'drizzle-orm';

import { drizzleClientHttp } from '@/db';
import { employees, onboardingTasks, organizations, organizationTokenAccounts, streams } from '@/db/schema';
import { AccountState } from '@/lib/enums';
import { DEFAULT_SETUP_PROGRESS, type SetupProgress } from '@/lib/state-persistence';

import { resolveOrganizationContext } from './organization-context';

const hasDatabase = Boolean(process.env.DATABASE_URL?.trim());

const ACCOUNT_STATE_ORDER: Record<AccountState, number> = {
  [AccountState.NEW_ACCOUNT]: 0,
  [AccountState.ONBOARDING]: 1,
  [AccountState.WALLET_CONNECTED]: 2,
  [AccountState.FIRST_STREAM_CREATED]: 3,
  [AccountState.FULLY_OPERATING]: 4,
};

function isStateUpgrade(current: AccountState, next: AccountState) {
  return ACCOUNT_STATE_ORDER[next] > ACCOUNT_STATE_ORDER[current];
}

export async function updateAccountState(state: AccountState) {
  if (!hasDatabase) {
    return { updated: false, reason: 'database-disabled' } as const;
  }

  const context = await resolveOrganizationContext();
  if (context.status === 'error') {
    return { updated: false, reason: context.reason } as const;
  }

  const { organizationId, accountState: currentState } = {
    organizationId: context.organizationId,
    accountState: (context.accountState as AccountState) ?? AccountState.NEW_ACCOUNT,
  };

  if (!isStateUpgrade(currentState, state)) {
    return { updated: false, reason: 'not-an-upgrade', currentState } as const;
  }

  await drizzleClientHttp
    .update(organizations)
    .set({
      accountState: state,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, organizationId));

  return { updated: true, previous: currentState, state } as const;
}

export type SetupSnapshot = {
  accountState: AccountState;
  progress: SetupProgress;
};

export async function getSetupSnapshot(): Promise<SetupSnapshot> {
  if (!hasDatabase) {
    return {
      accountState: AccountState.NEW_ACCOUNT,
      progress: { ...DEFAULT_SETUP_PROGRESS },
    };
  }

  const context = await resolveOrganizationContext();
  if (context.status === 'error') {
    return {
      accountState: AccountState.NEW_ACCOUNT,
      progress: { ...DEFAULT_SETUP_PROGRESS },
    };
  }

  const accountState = (context.accountState as AccountState | null) ?? AccountState.NEW_ACCOUNT;

  const { organizationId, primaryWallet } = context;

  const db = drizzleClientHttp;

  const [tokenAccountsResult, employeesResult, streamsResult, onboardingTaskRows] = await Promise.all([
    db
      .select({ count: count() })
      .from(organizationTokenAccounts)
      .where(
        and(
          eq(organizationTokenAccounts.organizationId, organizationId),
          gt(organizationTokenAccounts.latestBalance, 0),
        ),
      )
      .limit(1),
    db
      .select({ count: count() })
      .from(employees)
      .where(and(eq(employees.organizationId, organizationId), ne(employees.status, 'archived')))
      .limit(1),
    db.select({ count: count() }).from(streams).where(eq(streams.organizationId, organizationId)).limit(1),
    db
      .select({
        task: onboardingTasks.task,
        completedAt: onboardingTasks.completedAt,
      })
      .from(onboardingTasks)
      .where(eq(onboardingTasks.organizationId, organizationId)),
  ]);

  const tokenAccountFunded = Number(tokenAccountsResult.at(0)?.count ?? 0) > 0;
  const employeeAdded = Number(employeesResult.at(0)?.count ?? 0) > 0;
  const streamCreated = Number(streamsResult.at(0)?.count ?? 0) > 0;

  type OnboardingTaskSelect = typeof onboardingTasks.$inferSelect;

  const completedTasks = new Set<OnboardingTaskSelect['task']>(
    onboardingTaskRows.filter((entry) => entry.completedAt != null).map((entry) => entry.task),
  );

  let walletConnected =
    ACCOUNT_STATE_ORDER[accountState] >= ACCOUNT_STATE_ORDER[AccountState.WALLET_CONNECTED] || Boolean(primaryWallet);

  if (completedTasks.has('connect_wallet')) {
    walletConnected = true;
  }

  const progress: SetupProgress = {
    walletConnected,
    tokenAccountFunded: tokenAccountFunded || completedTasks.has('treasury_verified'),
    employeeAdded: employeeAdded || completedTasks.has('employee_added'),
    streamCreated: streamCreated || completedTasks.has('first_stream_created'),
  };

  return {
    accountState,
    progress,
  };
}
