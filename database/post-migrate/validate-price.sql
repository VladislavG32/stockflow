-- Выполняется ПОСЛЕ COMMIT Drizzle, отдельной транзакцией/запросом.
-- PostgreSQL проверяет старые строки с менее строгой блокировкой, чем ADD CHECK.
SET lock_timeout = '5s';
SET statement_timeout = '60s';
ALTER TABLE receipts VALIDATE CONSTRAINT receipts_price_range;
