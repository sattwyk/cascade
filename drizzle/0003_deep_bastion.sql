ALTER TABLE "stream_events" ALTER COLUMN "amount" SET DATA TYPE numeric(20, 6);--> statement-breakpoint
ALTER TABLE "streams" ALTER COLUMN "hourly_rate" SET DATA TYPE numeric(20, 6);--> statement-breakpoint
ALTER TABLE "streams" ALTER COLUMN "total_deposited" SET DATA TYPE numeric(20, 6);--> statement-breakpoint
ALTER TABLE "streams" ALTER COLUMN "total_deposited" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "streams" ALTER COLUMN "withdrawn_amount" SET DATA TYPE numeric(20, 6);--> statement-breakpoint
ALTER TABLE "streams" ALTER COLUMN "withdrawn_amount" SET DEFAULT '0';