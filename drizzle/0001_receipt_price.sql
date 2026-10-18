-- Ручной этап ЛР8: старые строки остаются с NULL, их стоимость неизвестна.
-- Drizzle выполняет файл в транзакции; таймауты не дают надолго заблокировать склад.
SET lock_timeout = '5s';--> statement-breakpoint
SET statement_timeout = '60s';--> statement-breakpoint
ALTER TABLE "receipts" ADD COLUMN "unit_price_kopecks" integer;--> statement-breakpoint
-- NOT VALID отделяет добавление ограничения от проверки исторических строк.
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_price_range" CHECK ("receipts"."unit_price_kopecks" IS NULL OR ("receipts"."unit_price_kopecks" >= 0 AND "receipts"."unit_price_kopecks" <= 1000000000)) NOT VALID;
