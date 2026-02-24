ALTER TABLE "streams"
ALTER COLUMN "hourly_rate" TYPE numeric(20, 6) USING "hourly_rate"::numeric(20, 6);

ALTER TABLE "streams"
ALTER COLUMN "total_deposited" TYPE numeric(20, 6) USING "total_deposited"::numeric(20, 6);

ALTER TABLE "streams"
ALTER COLUMN "total_deposited" SET DEFAULT '0';

ALTER TABLE "streams"
ALTER COLUMN "withdrawn_amount" TYPE numeric(20, 6) USING "withdrawn_amount"::numeric(20, 6);

ALTER TABLE "streams"
ALTER COLUMN "withdrawn_amount" SET DEFAULT '0';

ALTER TABLE "stream_events"
ALTER COLUMN "amount" TYPE numeric(20, 6) USING "amount"::numeric(20, 6);
