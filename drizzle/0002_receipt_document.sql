-- Автоматический этап ЛР8: дополнительный номер документа, без изменения старых строк.
SET lock_timeout = '5s';--> statement-breakpoint
SET statement_timeout = '60s';--> statement-breakpoint
ALTER TABLE "receipts" ADD COLUMN "document_reference" varchar(120);
