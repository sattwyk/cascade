import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

/**
 * Cascade draws most of its runtime state from on-chain accounts, but the employer
 * dashboard still needs a relational backing store for organization metadata,
 * employee profiles, stream mirrors, alerts, and activity history. The schema
 * below models the surfaces called out in:
 *   - anchor/docs/cascade-program.md
 *   - docs/employer-dashboard-product-spec.md
 *   - docs/employer-dashboard-ux-spec.md
 *   - UI flows under src/components/dashboard and src/app/dashboard
 *
 * The intent is to keep Solana as the system of record for funds, while Postgres
 * tracks user-facing context, onboarding progress, and derived analytics.
 */

export const accountStateEnum = pgEnum('account_state', [
  'new_account',
  'onboarding',
  'wallet_connected',
  'first_stream_created',
  'fully_operating',
]);

export const payrollCadenceEnum = pgEnum('payroll_cadence', [
  'weekly',
  'biweekly',
  'monthly',
  'semi_monthly',
  'custom',
]);

export const clusterEnum = pgEnum('solana_cluster', ['devnet', 'testnet', 'mainnet', 'localnet', 'custom']);

export const employmentTypeEnum = pgEnum('employment_type', [
  'full_time',
  'part_time',
  'contract',
  'temporary',
  'intern',
  'other',
]);

export const employeeStateEnum = pgEnum('employee_state', ['draft', 'invited', 'ready', 'archived']);

export const streamStateEnum = pgEnum('stream_state', ['draft', 'active', 'suspended', 'closed']);

export const walletRoleEnum = pgEnum('wallet_role', ['treasury', 'operator', 'viewer']);

export const organizationUserRoleEnum = pgEnum('organization_user_role', ['employer', 'employee']);

export const alertSeverityEnum = pgEnum('alert_severity', ['low', 'medium', 'high', 'critical']);

export const alertStatusEnum = pgEnum('alert_status', ['open', 'acknowledged', 'resolved', 'dismissed']);

export const alertTypeEnum = pgEnum('alert_type', [
  'low_runway',
  'inactivity',
  'pending_action',
  'suspended_stream',
  'token_account',
  'custom',
]);

export const streamEventTypeEnum = pgEnum('stream_event_type', [
  'stream_created',
  'stream_top_up',
  'stream_withdrawn',
  'stream_refresh_activity',
  'stream_emergency_withdraw',
  'stream_closed',
  'stream_reactivated',
]);

export const actorTypeEnum = pgEnum('actor_type', ['employer', 'employee', 'system']);

export const inviteStatusEnum = pgEnum('employee_invite_status', ['draft', 'sent', 'accepted', 'revoked', 'expired']);

export const onboardingTaskEnum = pgEnum('onboarding_task', [
  'connect_wallet',
  'profile_completed',
  'treasury_verified',
  'policies_acknowledged',
  'employee_added',
  'first_stream_created',
]);

export const organizations = pgTable(
  'organizations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: varchar('slug', { length: 64 }).notNull(),
    name: varchar('name', { length: 128 }).notNull(),
    organizationEmail: varchar('organization_email', { length: 255 }).notNull(),
    timezone: varchar('timezone', { length: 64 }).notNull(),
    payrollCadence: payrollCadenceEnum('payroll_cadence').default('monthly').notNull(),
    cadenceCustomLabel: varchar('cadence_custom_label', { length: 64 }),
    defaultMint: varchar('default_mint', { length: 64 }).notNull(),
    defaultTreasuryAccount: varchar('default_treasury_account', { length: 64 }),
    primaryWallet: varchar('primary_wallet', { length: 64 }).notNull(),
    cluster: clusterEnum('cluster').default('devnet').notNull(),
    accountState: accountStateEnum('account_state').default('new_account').notNull(),
    activityPolicyAcknowledgedAt: timestamp('activity_policy_acknowledged_at', { withTimezone: true }),
    emergencyPolicyAcknowledgedAt: timestamp('emergency_policy_acknowledged_at', { withTimezone: true }),
    onboardingCompletedAt: timestamp('onboarding_completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('organizations_slug_key').on(table.slug),
    index('organizations_primary_wallet_idx').on(table.primaryWallet),
  ],
);

export const onboardingEmailVerifications = pgTable(
  'onboarding_email_verifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: varchar('email', { length: 255 }).notNull(),
    organizationName: varchar('organization_name', { length: 128 }),
    codeHash: varchar('code_hash', { length: 128 }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    lastSentAt: timestamp('last_sent_at', { withTimezone: true }).defaultNow().notNull(),
    verificationAttempts: integer('verification_attempts').default(0).notNull(),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    claimedAt: timestamp('claimed_at', { withTimezone: true }),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex('onboarding_email_unique').on(table.email)],
);

export const organizationWallets = pgTable(
  'organization_wallets',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .references(() => organizations.id, { onDelete: 'cascade' })
      .notNull(),
    label: varchar('label', { length: 64 }),
    publicKey: varchar('public_key', { length: 64 }).notNull(),
    role: walletRoleEnum('role').default('operator').notNull(),
    isPrimary: boolean('is_primary').default(false).notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('organization_wallet_unique').on(table.organizationId, table.publicKey),
    index('organization_wallet_public_key_idx').on(table.publicKey),
  ],
);

export const organizationTokenAccounts = pgTable(
  'organization_token_accounts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .references(() => organizations.id, { onDelete: 'cascade' })
      .notNull(),
    mintAddress: varchar('mint_address', { length: 64 }).notNull(),
    tokenAccountAddress: varchar('token_account_address', { length: 64 }).notNull(),
    label: varchar('label', { length: 64 }),
    isDefault: boolean('is_default').default(false).notNull(),
    latestBalance: bigint('latest_balance', { mode: 'number' }).default(0).notNull(),
    lastSyncedSlot: bigint('last_synced_slot', { mode: 'number' }),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('organization_token_account_key').on(table.tokenAccountAddress),
    index('organization_mint_idx').on(table.organizationId, table.mintAddress),
  ],
);

export const employees = pgTable(
  'employees',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .references(() => organizations.id, { onDelete: 'cascade' })
      .notNull(),
    fullName: varchar('full_name', { length: 128 }).notNull(),
    email: varchar('email', { length: 255 }),
    department: varchar('department', { length: 64 }),
    location: varchar('location', { length: 128 }),
    employmentType: employmentTypeEnum('employment_type').default('full_time').notNull(),
    status: employeeStateEnum('status').default('draft').notNull(),
    primaryWallet: varchar('primary_wallet', { length: 64 }),
    backupWallet: varchar('backup_wallet', { length: 64 }),
    hourlyRateReference: numeric('hourly_rate_reference', { precision: 12, scale: 2 }),
    currency: varchar('currency', { length: 8 }).default('USD').notNull(),
    tags: text('tags').array(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
    invitedAt: timestamp('invited_at', { withTimezone: true }),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('employees_org_email_key').on(table.organizationId, table.email),
    index('employees_primary_wallet_idx').on(table.organizationId, table.primaryWallet),
    index('employees_status_idx').on(table.organizationId, table.status),
  ],
);

export const organizationUsers = pgTable(
  'organization_users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .references(() => organizations.id, { onDelete: 'cascade' })
      .notNull(),
    employeeId: uuid('employee_id').references(() => employees.id, { onDelete: 'set null' }),
    email: varchar('email', { length: 255 }).notNull(),
    displayName: varchar('display_name', { length: 128 }).notNull(),
    walletAddress: varchar('wallet_address', { length: 64 }),
    role: organizationUserRoleEnum('role').default('employee').notNull(),
    isPrimary: boolean('is_primary').default(false).notNull(),
    invitedAt: timestamp('invited_at', { withTimezone: true }),
    joinedAt: timestamp('joined_at', { withTimezone: true }),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('organization_user_unique_email').on(table.organizationId, table.email),
    index('organization_user_wallet_idx').on(table.walletAddress),
    index('organization_user_employee_idx').on(table.employeeId),
  ],
);

export const employeeStatusHistory = pgTable('employee_status_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  employeeId: uuid('employee_id')
    .references(() => employees.id, { onDelete: 'cascade' })
    .notNull(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  fromStatus: employeeStateEnum('from_status'),
  toStatus: employeeStateEnum('to_status').notNull(),
  changedByWallet: varchar('changed_by_wallet', { length: 64 }),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const employeeInvitations = pgTable(
  'employee_invitations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .references(() => organizations.id, { onDelete: 'cascade' })
      .notNull(),
    employeeId: uuid('employee_id')
      .references(() => employees.id, { onDelete: 'cascade' })
      .notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    status: inviteStatusEnum('status').default('sent').notNull(),
    inviteToken: uuid('invite_token').defaultRandom().notNull(),
    sentAt: timestamp('sent_at', { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
  },
  (table) => [uniqueIndex('employee_invite_unique').on(table.organizationId, table.email, table.status)],
);

export const streams = pgTable(
  'streams',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .references(() => organizations.id, { onDelete: 'cascade' })
      .notNull(),
    employeeId: uuid('employee_id')
      .references(() => employees.id, { onDelete: 'set null' })
      .notNull(),
    streamAddress: varchar('stream_address', { length: 64 }).notNull(),
    vaultAddress: varchar('vault_address', { length: 64 }).notNull(),
    employerWallet: varchar('employer_wallet', { length: 64 }).notNull(),
    employerTokenAccount: varchar('employer_token_account', { length: 64 }).notNull(),
    mintAddress: varchar('mint_address', { length: 64 }).notNull(),
    hourlyRate: bigint('hourly_rate', { mode: 'number' }).notNull(),
    totalDeposited: bigint('total_deposited', { mode: 'number' }).default(0).notNull(),
    withdrawnAmount: bigint('withdrawn_amount', { mode: 'number' }).default(0).notNull(),
    status: streamStateEnum('status').default('active').notNull(),
    cluster: clusterEnum('cluster').default('devnet').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    lastActivityAt: timestamp('last_activity_at', { withTimezone: true }),
    deactivatedAt: timestamp('deactivated_at', { withTimezone: true }),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    createdSignature: varchar('created_signature', { length: 128 }),
    lastSyncedSlot: bigint('last_synced_slot', { mode: 'number' }),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
    createdAtBlockTime: timestamp('created_at_block_time', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('streams_address_key').on(table.streamAddress),
    uniqueIndex('streams_vault_key').on(table.vaultAddress),
    index('streams_employee_idx').on(table.employeeId, table.status),
  ],
);

export const streamEvents = pgTable(
  'stream_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    streamId: uuid('stream_id')
      .references(() => streams.id, { onDelete: 'cascade' })
      .notNull(),
    organizationId: uuid('organization_id')
      .references(() => organizations.id, { onDelete: 'cascade' })
      .notNull(),
    eventType: streamEventTypeEnum('event_type').notNull(),
    actorType: actorTypeEnum('actor_type').default('system').notNull(),
    actorAddress: varchar('actor_address', { length: 64 }),
    signature: varchar('signature', { length: 128 }),
    slot: bigint('slot', { mode: 'number' }),
    amount: bigint('amount', { mode: 'number' }),
    tokenAccount: varchar('token_account', { length: 64 }),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('stream_events_stream_idx').on(table.streamId, table.occurredAt),
    uniqueIndex('stream_events_signature_key').on(table.signature),
  ],
);

export const alerts = pgTable(
  'alerts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .references(() => organizations.id, { onDelete: 'cascade' })
      .notNull(),
    streamId: uuid('stream_id').references(() => streams.id, { onDelete: 'set null' }),
    employeeId: uuid('employee_id').references(() => employees.id, { onDelete: 'set null' }),
    type: alertTypeEnum('type').notNull(),
    severity: alertSeverityEnum('severity').default('medium').notNull(),
    status: alertStatusEnum('status').default('open').notNull(),
    title: varchar('title', { length: 160 }).notNull(),
    description: text('description'),
    triggeredAt: timestamp('triggered_at', { withTimezone: true }).defaultNow().notNull(),
    acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true }),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('alerts_org_status_idx').on(table.organizationId, table.status),
    index('alerts_stream_idx').on(table.streamId, table.severity),
  ],
);

export const onboardingTasks = pgTable(
  'organization_onboarding_tasks',
  {
    organizationId: uuid('organization_id')
      .references(() => organizations.id, { onDelete: 'cascade' })
      .notNull(),
    task: onboardingTaskEnum('task').notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
  },
  (table) => [primaryKey({ columns: [table.organizationId, table.task] })],
);

export const organizationActivity = pgTable(
  'organization_activity',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .references(() => organizations.id, { onDelete: 'cascade' })
      .notNull(),
    streamId: uuid('stream_id').references(() => streams.id, { onDelete: 'set null' }),
    employeeId: uuid('employee_id').references(() => employees.id, { onDelete: 'set null' }),
    actorType: actorTypeEnum('actor_type').default('system').notNull(),
    actorAddress: varchar('actor_address', { length: 64 }),
    activityType: streamEventTypeEnum('activity_type').default('stream_created').notNull(),
    title: varchar('title', { length: 160 }).notNull(),
    description: text('description'),
    signature: varchar('signature', { length: 128 }),
    slot: bigint('slot', { mode: 'number' }),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
  },
  (table) => [index('organization_activity_idx').on(table.organizationId, table.occurredAt)],
);

export const organizationMetricsSnapshots = pgTable(
  'organization_metrics_snapshots',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .references(() => organizations.id, { onDelete: 'cascade' })
      .notNull(),
    intervalStart: timestamp('interval_start', { withTimezone: true }).notNull(),
    intervalEnd: timestamp('interval_end', { withTimezone: true }).notNull(),
    activeStreams: numeric('active_streams', { precision: 10, scale: 0 }).default('0'),
    monthlyBurn: numeric('monthly_burn', { precision: 20, scale: 6 }).default('0'),
    totalDeposited: numeric('total_deposited', { precision: 20, scale: 6 }).default('0'),
    vaultCoverageHours: numeric('vault_coverage_hours', { precision: 12, scale: 2 }).default('0'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('organization_metrics_interval_key').on(table.organizationId, table.intervalStart, table.intervalEnd),
  ],
);
