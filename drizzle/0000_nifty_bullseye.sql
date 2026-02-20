CREATE TYPE "public"."account_state" AS ENUM('new_account', 'onboarding', 'wallet_connected', 'first_stream_created', 'fully_operating');--> statement-breakpoint
CREATE TYPE "public"."actor_type" AS ENUM('employer', 'employee', 'system');--> statement-breakpoint
CREATE TYPE "public"."alert_severity" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."alert_status" AS ENUM('open', 'acknowledged', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."alert_type" AS ENUM('low_runway', 'inactivity', 'pending_action', 'suspended_stream', 'token_account', 'custom');--> statement-breakpoint
CREATE TYPE "public"."solana_cluster" AS ENUM('devnet', 'testnet', 'mainnet', 'localnet', 'custom');--> statement-breakpoint
CREATE TYPE "public"."employee_state" AS ENUM('draft', 'invited', 'ready', 'archived');--> statement-breakpoint
CREATE TYPE "public"."employment_type" AS ENUM('full_time', 'part_time', 'contract', 'temporary', 'intern', 'other');--> statement-breakpoint
CREATE TYPE "public"."employee_invite_status" AS ENUM('draft', 'sent', 'accepted', 'revoked', 'expired');--> statement-breakpoint
CREATE TYPE "public"."onboarding_task" AS ENUM('connect_wallet', 'profile_completed', 'treasury_verified', 'policies_acknowledged', 'employee_added', 'first_stream_created');--> statement-breakpoint
CREATE TYPE "public"."payroll_cadence" AS ENUM('weekly', 'biweekly', 'monthly', 'semi_monthly', 'custom');--> statement-breakpoint
CREATE TYPE "public"."stream_event_type" AS ENUM('stream_created', 'stream_top_up', 'stream_withdrawn', 'stream_refresh_activity', 'stream_emergency_withdraw', 'stream_closed', 'stream_reactivated');--> statement-breakpoint
CREATE TYPE "public"."stream_state" AS ENUM('draft', 'active', 'suspended', 'closed');--> statement-breakpoint
CREATE TYPE "public"."wallet_role" AS ENUM('treasury', 'operator', 'viewer');--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"stream_id" uuid,
	"employee_id" uuid,
	"type" "alert_type" NOT NULL,
	"severity" "alert_severity" DEFAULT 'medium' NOT NULL,
	"status" "alert_status" DEFAULT 'open' NOT NULL,
	"title" varchar(160) NOT NULL,
	"description" text,
	"triggered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"acknowledged_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"status" "employee_invite_status" DEFAULT 'sent' NOT NULL,
	"invite_token" uuid DEFAULT gen_random_uuid() NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"accepted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"from_status" "employee_state",
	"to_status" "employee_state" NOT NULL,
	"changed_by_wallet" varchar(64),
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"full_name" varchar(128) NOT NULL,
	"email" varchar(255),
	"department" varchar(64),
	"location" varchar(128),
	"employment_type" "employment_type" DEFAULT 'full_time' NOT NULL,
	"status" "employee_state" DEFAULT 'draft' NOT NULL,
	"primary_wallet" varchar(64),
	"backup_wallet" varchar(64),
	"hourly_rate_reference" numeric(12, 2),
	"currency" varchar(8) DEFAULT 'USD' NOT NULL,
	"tags" text[],
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"invited_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "onboarding_email_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"organization_name" varchar(128),
	"code_hash" varchar(128) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"verification_attempts" integer DEFAULT 0 NOT NULL,
	"verified_at" timestamp with time zone,
	"claimed_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_onboarding_tasks" (
	"organization_id" uuid NOT NULL,
	"task" "onboarding_task" NOT NULL,
	"completed_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "organization_onboarding_tasks_organization_id_task_pk" PRIMARY KEY("organization_id","task")
);
--> statement-breakpoint
CREATE TABLE "organization_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"stream_id" uuid,
	"employee_id" uuid,
	"actor_type" "actor_type" DEFAULT 'system' NOT NULL,
	"actor_address" varchar(64),
	"activity_type" "stream_event_type" DEFAULT 'stream_created' NOT NULL,
	"title" varchar(160) NOT NULL,
	"description" text,
	"signature" varchar(128),
	"slot" bigint,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_metrics_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"interval_start" timestamp with time zone NOT NULL,
	"interval_end" timestamp with time zone NOT NULL,
	"active_streams" numeric(10, 0) DEFAULT '0',
	"monthly_burn" numeric(20, 6) DEFAULT '0',
	"total_deposited" numeric(20, 6) DEFAULT '0',
	"vault_coverage_hours" numeric(12, 2) DEFAULT '0',
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_token_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"mint_address" varchar(64) NOT NULL,
	"token_account_address" varchar(64) NOT NULL,
	"label" varchar(64),
	"is_default" boolean DEFAULT false NOT NULL,
	"latest_balance" bigint DEFAULT 0 NOT NULL,
	"last_synced_slot" bigint,
	"last_synced_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_wallets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"label" varchar(64),
	"public_key" varchar(64) NOT NULL,
	"role" "wallet_role" DEFAULT 'operator' NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"last_seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(64) NOT NULL,
	"name" varchar(128) NOT NULL,
	"organization_email" varchar(255) NOT NULL,
	"timezone" varchar(64) NOT NULL,
	"payroll_cadence" "payroll_cadence" DEFAULT 'biweekly' NOT NULL,
	"cadence_custom_label" varchar(64),
	"default_mint" varchar(64) NOT NULL,
	"default_treasury_account" varchar(64),
	"primary_wallet" varchar(64) NOT NULL,
	"cluster" "solana_cluster" DEFAULT 'devnet' NOT NULL,
	"account_state" "account_state" DEFAULT 'new_account' NOT NULL,
	"activity_policy_acknowledged_at" timestamp with time zone,
	"emergency_policy_acknowledged_at" timestamp with time zone,
	"onboarding_completed_at" timestamp with time zone,
	"demo_mode" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stream_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stream_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"event_type" "stream_event_type" NOT NULL,
	"actor_type" "actor_type" DEFAULT 'system' NOT NULL,
	"actor_address" varchar(64),
	"signature" varchar(128),
	"slot" bigint,
	"amount" bigint,
	"token_account" varchar(64),
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "streams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"stream_address" varchar(64) NOT NULL,
	"vault_address" varchar(64) NOT NULL,
	"employer_wallet" varchar(64) NOT NULL,
	"employer_token_account" varchar(64) NOT NULL,
	"mint_address" varchar(64) NOT NULL,
	"hourly_rate" bigint NOT NULL,
	"total_deposited" bigint DEFAULT 0 NOT NULL,
	"withdrawn_amount" bigint DEFAULT 0 NOT NULL,
	"status" "stream_state" DEFAULT 'active' NOT NULL,
	"cluster" "solana_cluster" DEFAULT 'devnet' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"last_activity_at" timestamp with time zone,
	"deactivated_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"created_signature" varchar(128),
	"last_synced_slot" bigint,
	"last_synced_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at_block_time" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_stream_id_streams_id_fk" FOREIGN KEY ("stream_id") REFERENCES "public"."streams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_invitations" ADD CONSTRAINT "employee_invitations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_invitations" ADD CONSTRAINT "employee_invitations_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_status_history" ADD CONSTRAINT "employee_status_history_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_status_history" ADD CONSTRAINT "employee_status_history_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_onboarding_tasks" ADD CONSTRAINT "organization_onboarding_tasks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_activity" ADD CONSTRAINT "organization_activity_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_activity" ADD CONSTRAINT "organization_activity_stream_id_streams_id_fk" FOREIGN KEY ("stream_id") REFERENCES "public"."streams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_activity" ADD CONSTRAINT "organization_activity_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_metrics_snapshots" ADD CONSTRAINT "organization_metrics_snapshots_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_token_accounts" ADD CONSTRAINT "organization_token_accounts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_wallets" ADD CONSTRAINT "organization_wallets_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stream_events" ADD CONSTRAINT "stream_events_stream_id_streams_id_fk" FOREIGN KEY ("stream_id") REFERENCES "public"."streams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stream_events" ADD CONSTRAINT "stream_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "streams" ADD CONSTRAINT "streams_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "streams" ADD CONSTRAINT "streams_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "alerts_org_status_idx" ON "alerts" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "alerts_stream_idx" ON "alerts" USING btree ("stream_id","severity");--> statement-breakpoint
CREATE UNIQUE INDEX "employee_invite_unique" ON "employee_invitations" USING btree ("organization_id","email","status");--> statement-breakpoint
CREATE UNIQUE INDEX "employees_org_email_key" ON "employees" USING btree ("organization_id","email");--> statement-breakpoint
CREATE INDEX "employees_primary_wallet_idx" ON "employees" USING btree ("organization_id","primary_wallet");--> statement-breakpoint
CREATE INDEX "employees_status_idx" ON "employees" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "onboarding_email_unique" ON "onboarding_email_verifications" USING btree ("email");--> statement-breakpoint
CREATE INDEX "organization_activity_idx" ON "organization_activity" USING btree ("organization_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_metrics_interval_key" ON "organization_metrics_snapshots" USING btree ("organization_id","interval_start","interval_end");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_token_account_key" ON "organization_token_accounts" USING btree ("token_account_address");--> statement-breakpoint
CREATE INDEX "organization_mint_idx" ON "organization_token_accounts" USING btree ("organization_id","mint_address");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_wallet_unique" ON "organization_wallets" USING btree ("organization_id","public_key");--> statement-breakpoint
CREATE INDEX "organization_wallet_public_key_idx" ON "organization_wallets" USING btree ("public_key");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "organizations_primary_wallet_idx" ON "organizations" USING btree ("primary_wallet");--> statement-breakpoint
CREATE INDEX "stream_events_stream_idx" ON "stream_events" USING btree ("stream_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "stream_events_signature_key" ON "stream_events" USING btree ("signature");--> statement-breakpoint
CREATE UNIQUE INDEX "streams_address_key" ON "streams" USING btree ("stream_address");--> statement-breakpoint
CREATE UNIQUE INDEX "streams_vault_key" ON "streams" USING btree ("vault_address");--> statement-breakpoint
CREATE INDEX "streams_employee_idx" ON "streams" USING btree ("employee_id","status");