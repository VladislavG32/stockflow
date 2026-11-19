#!/usr/bin/env bash
# Sourced by deploy.sh after the deployment lock and image revision checks.
# Keep backups on the target with mode 600. Only schema and checks leave it.
set -Eeuo pipefail
schema_dir=${1:?verified TEST or STAGE schema directory}
operation=${2:?apply or plan}
approved_plan=${3:-}
[[ "$schema_dir" == /* && ( "$operation" == apply || "$operation" == plan ) ]]
[[ "$TARGET" == stage || "$TARGET" == prod ]]
if [[ "$TARGET" == stage ]]; then
  [[ "$operation" == apply && -z "$approved_plan" ]]
fi

schema_sql='select created_at, hash from drizzle.__drizzle_migrations order by id'
counts_sql='select (select count(*) from materials), (select count(*) from suppliers), count(*), coalesce(sum(quantity),0) from receipts'
db_sql() {
  docker exec "$original_db" sh -ec 'exec psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" "$@"' sh -Atqc "$1"
}
db_dump() {
  docker exec "$original_db" sh -ec 'exec pg_dump -U "$POSTGRES_USER" "$@" "$POSTGRES_DB"' sh "$@"
}
normal_dump() {
  bash "$root/scripts/db/normalize-schema.sh"
}
snapshot() {
  local folder=$1
  db_dump --schema-only --no-owner --no-privileges | normal_dump > "$folder/schema.sql"
  db_sql "$schema_sql" > "$folder/history.txt"
  db_sql "$counts_sql" > "$folder/counts.txt"
  db_sql "$fingerprint_sql" | sha256sum > "$folder/fingerprint.txt"
}
same_snapshot() {
  local file
  for file in schema.sql history.txt counts.txt fingerprint.txt; do
    cmp "$1/$file" "$2/$file"
  done
}

mkdir -p "$state/database"
evidence=$(mktemp -d "$state/database/$TARGET-$release_sha.XXXXXX")
mkdir "$evidence/before" "$evidence/after"
db_sql "$schema_sql" > "$evidence/before/history.txt"
before_count=$(wc -l < "$evidence/before/history.txt")
final_count=$(wc -l < "$schema_dir/history.txt")
[[ "$before_count" -ge 1 && "$before_count" -le "$final_count" ]]
material='to_jsonb(materials)'
supplier='to_jsonb(suppliers)'
receipt='to_jsonb(receipts)'
if (( before_count == 1 )); then
  material+=" - 'additional_units'"
  supplier+=" - array['tax_id','legal_address']"
fi
if (( before_count < 3 )); then receipt+=" - 'unit_price_kopecks'"; fi
if (( before_count < 4 )); then receipt+=" - 'document_reference'"; fi
fingerprint_sql="
  set timezone='UTC';
  select $material from materials order by id;
  select $supplier from suppliers order by id;
  select $receipt from receipts order by id;
"
snapshot "$evidence/before"
head -n "$before_count" "$schema_dir/history.txt" | cmp - "$evidence/before/history.txt"
if (( before_count == final_count )); then
  cmp "$schema_dir/schema.sql" "$evidence/before/schema.sql"
  if [[ "$TARGET" == stage ]]; then
    echo 'STAGE: проверенная схема и журнал уже применены.'
  fi
else
  cmp "$schema_dir/prefix-$before_count.schema.sql" "$evidence/before/schema.sql"
fi
if [[ "$TARGET" == stage ]]; then
  [[ "$before_count" -ge $((final_count - 1)) ]]
fi
printf '%s: схема и журнал совпадают с TEST (миграций: %s из %s).\n' "$TARGET" "$before_count" "$final_count"
printf 'Строки (материалы|поставщики|поступления|сумма количества): '; cat "$evidence/before/counts.txt"

if [[ "$TARGET" == prod && "$operation" == apply ]]; then
  [[ "$approved_plan" =~ ^prod-[a-f0-9]{40}\.[a-zA-Z0-9]+:[a-f0-9]{64}$ ]]
  plan_key=${approved_plan%%:*}
  plan_hash=${approved_plan#*:}
  [[ "$plan_key" == "prod-$release_sha."* ]]
  plan="$state/database/$plan_key"
  test -f "$plan/ready"
  same_snapshot "$plan/before" "$evidence/before"
  printf '%s  %s\n' "$plan_hash" "$plan/backup.dump" | sha256sum -c -
  printf '%s\n%s\n%s\n' "$APP_IMAGE" "$MIGRATOR_IMAGE" "$release_sha" | cmp - "$plan/release.txt"
  cmp "$schema_dir/schema.sql" "$plan/after/schema.sql"
  cmp "$schema_dir/history.txt" "$plan/after/history.txt"
  backup="$plan/backup.dump"
else
  backup="$evidence/backup.dump"
  db_dump -Fc > "$backup"
fi
sha256sum "$backup" > "$evidence/backup.sha256"
sha256sum -c "$evidence/backup.sha256"
cat "$evidence/backup.sha256"
docker exec -i "$original_db" pg_restore --list < "$backup" > "$evidence/backup.contents"
printf 'pg_restore --list: %s записей\n' "$(grep -c '^[0-9]' "$evidence/backup.contents")"

rehearsal="stockflow-rehearsal-$(cat /proc/sys/kernel/random/uuid)"
postgres_image=$(docker inspect "$original_db" --format '{{.Image}}')
(
  docker run --rm -d --pull never --network none --name "$rehearsal" \
    --tmpfs /var/lib/postgresql/data:size=256m --memory 384m \
    -e POSTGRES_HOST_AUTH_METHOD=trust "$postgres_image" >/dev/null
  trap 'docker stop "$rehearsal" >/dev/null' EXIT
  for _ in $(seq 1 30); do
    if docker exec "$rehearsal" pg_isready -h 127.0.0.1 -U postgres >/dev/null; then break; fi
    sleep 1
  done
  docker exec "$rehearsal" pg_isready -h 127.0.0.1 -U postgres
  docker exec "$rehearsal" createdb -U postgres rehearsal
  docker exec -i "$rehearsal" pg_restore --exit-on-error --no-owner --no-privileges -U postgres -d rehearsal < "$backup"
  rehearsal_sql() {
    docker exec "$rehearsal" psql -X -v ON_ERROR_STOP=1 -U postgres -d rehearsal -Atqc "$1"
  }
  copy_dump() {
    docker exec "$rehearsal" pg_dump --schema-only --no-owner --no-privileges -U postgres rehearsal | normal_dump
  }
  cmp "$evidence/before/schema.sql" <(copy_dump)
  cmp "$evidence/before/history.txt" <(rehearsal_sql "$schema_sql")
  cmp "$evidence/before/fingerprint.txt" <(rehearsal_sql "$fingerprint_sql" | sha256sum)
  echo 'Восстановленная копия совпадает с исходной БД.'
  docker run --rm --pull never --network "container:$rehearsal" \
    -e DATABASE_URL=postgresql://postgres@127.0.0.1:5432/rehearsal "$MIGRATOR_IMAGE"
  copy_dump > "$evidence/after/schema.sql"
  rehearsal_sql "$schema_sql" > "$evidence/after/history.txt"
  cmp "$schema_dir/schema.sql" "$evidence/after/schema.sql"
  cmp "$schema_dir/history.txt" "$evidence/after/history.txt"
  cmp "$evidence/before/counts.txt" <(rehearsal_sql "$counts_sql")
  cmp "$evidence/before/fingerprint.txt" <(rehearsal_sql "$fingerprint_sql" | sha256sum)
  echo 'Репетиция: целевая схема, журнал и старые записи проверены.'
)

if [[ "$operation" == plan ]]; then
  sha256sum "$evidence/after/schema.sql"
  printf '%s\n%s\n%s\n' "$APP_IMAGE" "$MIGRATOR_IMAGE" "$release_sha" > "$evidence/release.txt"
  touch "$evidence/ready"
  if (( before_count < final_count )); then
    echo "Миграции плана:"
    tail -n "$((final_count - before_count))" "$schema_dir/history.txt"
  fi
  echo "Доставить образ $APP_IMAGE"
  printf 'PROD_PLAN=%s:%s\n' "${evidence##*/}" "$(awk '{print $1}' "$evidence/backup.sha256")"
  exit 0
fi
check_database
mkdir "$evidence/recheck"
snapshot "$evidence/recheck"
same_snapshot "$evidence/before" "$evidence/recheck"
if (( before_count < final_count )); then
  "${release[@]}" run --rm -T --no-deps --pull never migrate
fi
check_database
snapshot "$evidence/after"
cmp "$schema_dir/schema.sql" "$evidence/after/schema.sql"
cmp "$schema_dir/history.txt" "$evidence/after/history.txt"
cmp "$evidence/before/counts.txt" "$evidence/after/counts.txt"
cmp "$evidence/before/fingerprint.txt" "$evidence/after/fingerprint.txt"
sha256sum "$evidence/after/schema.sql"
echo "$TARGET: целевая схема и журнал совпали, исторические строки сохранены."
