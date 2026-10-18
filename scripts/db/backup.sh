#!/usr/bin/env bash
# Полный backup перед изменением. Права 700/600: внутри реальные данные стенда.
# Проверка не ограничивается размером файла: архив восстанавливается в отдельной БД.
set -Eeuo pipefail
source scripts/ops/common.sh
umask 077
out=${1:?backup directory}
mkdir -p "$out"
# На 25-ГБ диске проверяем запас для архива и двух последовательных restore-копий.
size=$(pgcmd psql -X -U stockflow -d stockflow -At -c "select pg_database_size('stockflow')")
[[ "$size" =~ ^[0-9]+$ ]] || exit 1
free=$(df -Pm "$out" | awk 'NR==2 {print $4}')
(( free > (size * 3 / 1048576 + 512) )) || { echo 'Недостаточно места для проверенного backup' >&2; exit 1; }
file="$out/stockflow-$(date -u +%Y%m%dT%H%M%SZ)-$$.dump"
pgcmd pg_dump -U stockflow -d stockflow -Fc > "$file"
test -s "$file"
pgcmd pg_restore --list < "$file" > "$file.list"
check="stockflow_restore_check_$$"
# Имя генерируется здесь, не берётся из пользовательского SQL или аргумента.
pgcmd createdb -U stockflow "$check"
trap 'pgcmd dropdb -U stockflow "$check"' EXIT
pgcmd pg_restore -U stockflow -d "$check" --exit-on-error --no-owner --no-privileges < "$file"
pgcmd psql -X -U stockflow -d "$check" -v ON_ERROR_STOP=1 -c 'select count(*) from materials; select count(*) from suppliers; select count(*) from receipts;' > "$file.restore-check.txt"
# Проверяем эквивалентность восстановленных строк, не выводя сами данные в CI.
for table in materials suppliers receipts; do
  original=$(pgcmd psql -X -U stockflow -d stockflow -At -c "select md5(coalesce(string_agg(row_to_json(t)::text, '' order by id), '')) from $table t;")
  restored=$(pgcmd psql -X -U stockflow -d "$check" -At -c "select md5(coalesce(string_agg(row_to_json(t)::text, '' order by id), '')) from $table t;")
  [[ "$original" == "$restored" ]] || { echo 'База изменилась во время backup либо восстановление отличается. Повторите в окне обслуживания.' >&2; exit 1; }
done
sha256sum "$file" > "$file.sha256"
echo "$file"
