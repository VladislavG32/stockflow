# Штатный экспорт схемы PostgreSQL

Здесь сохранён реальный `pg_dump --schema-only`, созданный 18 октября 2026 года
pg_dump 17.6 из отдельной локальной PostgreSQL 17.10 после миграций 0000–0002,
а также migrations.txt и SHA256SUMS. В ручной контрольной ветке экспорт содержит
только 0000–0001. Пользовательских строк в этих файлах нет.
SQL-миграции находятся в drizzle; они не выдаются за экспорт pg_dump.

На TEST (отдельная учебная версия, не текущая база ЛР3):

```bash
bash scripts/db/export.sh database/schema
git add database/schema
git commit -m "docs(lab8): record actual PostgreSQL schema export"
```

Перед коммитом просмотрите schema.raw.sql: не должно быть секретов, пользователей,
посторонних схем. Этот локальный экспорт не доказывает обновление VM:
повторите его на TEST в ходе ЛР8, зафиксируйте build number и реальный результат.
