CREATE TYPE "public"."organization_user_role" AS ENUM('employer', 'employee');--> statement-breakpoint
CREATE TABLE "organization_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"employee_id" uuid,
	"email" varchar(255) NOT NULL,
	"display_name" varchar(128) NOT NULL,
	"wallet_address" varchar(64),
	"role" "organization_user_role" DEFAULT 'employee' NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"invited_at" timestamp with time zone,
	"joined_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organizations" ALTER COLUMN "payroll_cadence" SET DEFAULT 'monthly';--> statement-breakpoint
ALTER TABLE "organization_users" ADD CONSTRAINT "organization_users_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_users" ADD CONSTRAINT "organization_users_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "organization_user_unique_email" ON "organization_users" USING btree ("organization_id","email");--> statement-breakpoint
CREATE INDEX "organization_user_wallet_idx" ON "organization_users" USING btree ("wallet_address");--> statement-breakpoint
CREATE INDEX "organization_user_employee_idx" ON "organization_users" USING btree ("employee_id");--> statement-breakpoint
ALTER TABLE "organizations" DROP COLUMN "demo_mode";