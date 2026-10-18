#!/usr/bin/env bash
# Вызывается deploy.sh под общей блокировкой; reference получен из успешного TEST.
# Перед изменением STAGE/PROD репетируем миграцию на восстановленной копии его БД.
set -Eeuo pipefail
source scripts/ops/common.sh
[[ -e /proc/$$/fd/9 ]] || { echo 'Запускайте через deploy.sh с блокировкой' >&2; exit 1; }
test -s reference/schema.sql
test -s reference/migrations.txt
work="/opt/stockflow-ci/state/migration-$(date -u +%Y%m%dT%H%M%SZ)-$$"
mkdir -p "$work"
bash scripts/db/export.sh "$work/before"
# Применённые миграции должны быть префиксом проверенной истории TEST/STAGE.
count=$(wc -l < "$work/before/migrations.txt")
head -n "$count" reference/migrations.txt > "$work/prefix.txt"
cmp "$work/prefix.txt" "$work/before/migrations.txt"
backup=$(bash scripts/db/backup.sh /opt/stockflow-ci/backups)
check="stockflow_rehearsal_$$"
pgcmd createdb -U stockflow "$check"
trap 'pgcmd dropdb -U stockflow "$check"' EXIT
pgcmd pg_restore -U stockflow -d "$check" --exit-on-error --no-owner --no-privileges < "$backup"
release=("${base[@]}" -f "$PWD/compose.release.yaml")
"${release[@]}" run --rm --no-deps -e "MIGRATION_DATABASE=$check" migrate
pgcmd pg_dump -U stockflow -d "$check" --schema-only --no-owner --no-privileges > "$work/rehearsal.raw.sql"
sed -E '/^--/d; /^\\(un)?restrict /d; /^[[:space:]]*$/d' "$work/rehearsal.raw.sql" > "$work/rehearsal.sql"
pgcmd psql -X -U stockflow -d "$check" -At -c 'select hash from drizzle.__drizzle_migrations order by created_at,id' > "$work/rehearsal-migrations.txt"
cmp reference/schema.sql "$work/rehearsal.sql"
cmp reference/migrations.txt "$work/rehearsal-migrations.txt"
# Только после проверки копии меняем рабочую схему. Ошибка запрещает обновление app.
"${release[@]}" run --rm --no-deps migrate
bash scripts/db/export.sh "$work/after"
cmp reference/schema.sql "$work/after/schema.sql"
cmp reference/migrations.txt "$work/after/migrations.txt"
echo 'Схема и история совпали с проверенным эталоном'
