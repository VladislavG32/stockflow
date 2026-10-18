#!/usr/bin/env bash
# Запуск на стенде. pg_dump 17 находится в существующем контейнере PostgreSQL.
# Передаём каталог результата; дамп схемы не содержит пользовательских строк.
set -Eeuo pipefail
source scripts/ops/common.sh
out=${1:?directory}
mkdir -p "$out"
pgcmd pg_dump -U stockflow -d stockflow --schema-only --no-owner --no-privileges > "$out/schema.raw.sql"
# PG17 добавляет случайные restrict-маркеры. Их и комментарии исключаем только
# из файла сравнения, исходный штатный экспорт сохраняется без изменений.
sed -E '/^--/d; /^\\(un)?restrict /d; /^[[:space:]]*$/d' "$out/schema.raw.sql" > "$out/schema.sql"
pgcmd psql -X -U stockflow -d stockflow -At -c 'select hash from drizzle.__drizzle_migrations order by created_at,id' > "$out/migrations.txt"
sha256sum "$out/schema.sql" "$out/migrations.txt" > "$out/SHA256SUMS"
