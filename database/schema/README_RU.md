# Штатный экспорт схемы PostgreSQL

Сюда помещается реальный `pg_dump --schema-only`, созданный после успешного
тестирования выбранной версии, а также migrations.txt и SHA256SUMS.
SQL-миграции находятся в drizzle; они не выдаются за экспорт pg_dump.

На TEST (отдельная учебная версия, не текущая база ЛР3):

```bash
bash scripts/db/export.sh database/schema
git add database/schema
git commit -m "docs(lab8): record actual PostgreSQL schema export"
```

Перед коммитом просмотрите schema.raw.sql: не должно быть секретов, пользователей,
посторонних схем. Отсутствие экспорта пока означает незавершённый внешний шаг.
