# Актуальная схема StockFlow

Экспорт получен на TEST в изолированной PostgreSQL 17.11 (`postgres:17-bookworm`) для коммита `230a1001980be5cc9541e1e3e73003b7d3136514`. После применения миграций с нуля и после обновления с `0001_lab7_catalog_fields` схемы совпали. SHA-256 файла `schema.sql` — `5ab4e2e52a3337db64c63ce2942c092f665f1876dbf35d6f106cc502c7ec817b`.

`migration-history.txt` содержит значения `created_at|hash` из `drizzle.__drizzle_migrations` в порядке применения. Acceptance повторно проверяет экспорт и журнал и сохраняет файлы `integration-environment.txt`, `migration-history.txt` и `migration-upgrade.log`.

SQL поступает из `pg_dump --schema-only --no-owner --no-privileges`. При нормализации убираются случайные маркеры сессии pg_dump, комментарии с версиями и различия в окончаниях строк и пустые строки в конце. В экспорт входят определения объектов базы, включая таблицу журнала Drizzle.
