# Актуальная схема StockFlow

Экспорт получен на TEST в изолированной PostgreSQL 17.11 (`postgres:17-bookworm`) для коммита `e2b777491bab12e87c5bdc58f7218b779e560cba`. После применения миграций с нуля и после обновления с `0002_lab8_receipt_price` схемы совпали. SHA-256 файла `schema.sql` — `bf3dd638705954214a9091d7da3d52b5d0e88280429124a88bd5692fffec60de`.

`migration-history.txt` содержит значения `created_at|hash` из `drizzle.__drizzle_migrations` в порядке применения. Acceptance повторно проверяет экспорт и журнал и сохраняет файлы `integration-environment.txt`, `migration-history.txt` и `migration-upgrade.log`.

SQL поступает из `pg_dump --schema-only --no-owner --no-privileges`. При нормализации убираются случайные маркеры сессии pg_dump, комментарии с версиями и различия в окончаниях строк и пустые строки в конце. В экспорт входят определения объектов базы, включая таблицу журнала Drizzle.
