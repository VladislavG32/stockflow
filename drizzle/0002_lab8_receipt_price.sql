SET LOCAL lock_timeout = '5s';--> statement-breakpoint
SET LOCAL statement_timeout = '60s';--> statement-breakpoint
-- The API caps the price at the integer limit and keeps the total exact.
-- squawk-ignore prefer-bigint-over-int
ALTER TABLE "public"."receipts" ADD COLUMN "unit_price_kopecks" integer;--> statement-breakpoint
-- Existing rows have NULL in the new column and already satisfy the check.
-- NOT VALID avoids scanning the table with the ADD COLUMN lock held.
ALTER TABLE "public"."receipts" ADD CONSTRAINT "receipts_nonnegative_unit_price" CHECK ("unit_price_kopecks" >= 0) NOT VALID;
