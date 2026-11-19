#!/usr/bin/env bash
set -Eeuo pipefail

bash scripts/ci/preflight.sh test
sha=$(git rev-parse HEAD)
bash scripts/ci/load-bundle.sh incoming
export CI_IMAGE="stockflow-ci-runner:$sha"
export CI_MIGRATOR_IMAGE="stockflow-ci-migrator:$sha"
export CI_TEST_IMAGE="stockflow-ci-test-tools:$sha"
revision=$(docker image inspect "$CI_TEST_IMAGE" --format '{{index .Config.Labels "org.opencontainers.image.revision"}}')
[[ "$revision" == "$sha" ]]

CI_RUN_ID=$(cat /proc/sys/kernel/random/uuid)
CI_DB_PASSWORD=$(cat /proc/sys/kernel/random/uuid)
export CI_RUN_ID CI_DB_PASSWORD
[[ "$CI_RUN_ID" =~ ^[a-f0-9-]{36}$ ]]
project="stockflow-ci-$CI_RUN_ID"
ci=(docker compose --env-file /dev/null -p "$project" -f compose.ci.yaml)
mkdir -p artifacts

verify_database_container() {
  local container actual
  container=$("${ci[@]}" ps -aq db)
  [[ -n "$container" ]] || return 1
  actual=$(docker inspect --format '{{index .Config.Labels "com.docker.compose.project"}}|{{index .Config.Labels "com.docker.compose.service"}}|{{index .HostConfig.Tmpfs "/var/lib/postgresql/data"}}|{{range .Mounts}}{{.Type}}:{{.Destination}}{{end}}' "$container") || return 1
  [[ "$actual" == "$project|db|size=256m|" || "$actual" == "$project|db|size=256m|tmpfs:/var/lib/postgresql/data" ]]
}

cleanup() {
  local status=$?
  "${ci[@]}" logs --no-color > artifacts/integration-compose.log 2>&1 || true
  if verify_database_container; then
    "${ci[@]}" down || status=1
  fi
  exit "$status"
}
trap cleanup EXIT

"${ci[@]}" up -d --no-build --wait --wait-timeout 90 db
verify_database_container
database_identity=$("${ci[@]}" exec -T db psql -X -U stockflow_ci -d stockflow_ci -Atqc \
  "select current_database(), current_user, current_setting('server_version_num')::int / 10000, current_setting('stockflow.ci_run', true)")
[[ "$database_identity" == "stockflow_ci|stockflow_ci|17|$CI_RUN_ID" ]]
printf 'SHA %s | проект %s | PostgreSQL 17 | БД stockflow_ci | tmpfs\n' "$sha" "$project" \
  | tee artifacts/integration-environment.txt
"${ci[@]}" up -d --no-build --wait --wait-timeout 120 app
"${ci[@]}" run --rm -T --no-deps tests 2> >(tee artifacts/integration.log >&2) \
  | bash scripts/ci/junit.sh > artifacts/integration.junit.xml

"${ci[@]}" up -d --no-deps --force-recreate --no-build --wait --wait-timeout 90 app
"${ci[@]}" run --rm -T --no-deps -e STOCKFLOW_INTEGRATION_PHASE=persistence tests \
  2> >(tee artifacts/persistence.log >&2) | bash scripts/ci/junit.sh > artifacts/persistence.junit.xml

"${ci[@]}" run --rm -T --no-deps -e CI_RUN_ID migrate node --input-type=module \
  < scripts/ci/check-upgrade.mjs 2>&1 | tee artifacts/migration-upgrade.log
for database in stockflow_ci stockflow_ci_upgrade; do
  "${ci[@]}" exec -T db pg_dump --schema-only --no-owner --no-privileges -U stockflow_ci "$database" \
    | bash scripts/db/normalize-schema.sh > "artifacts/$database.schema.sql"
done
diff -u artifacts/stockflow_ci.schema.sql artifacts/stockflow_ci_upgrade.schema.sql
echo 'pg_dump: схемы чистой базы и базы после обновления с 0001 совпадают.' \
  | tee -a artifacts/migration-upgrade.log
"${ci[@]}" exec -T db psql -X -U stockflow_ci -d stockflow_ci -Atc \
  'select created_at, hash from drizzle.__drizzle_migrations order by id' > artifacts/migration-history.txt
sha256sum artifacts/stockflow_ci.schema.sql | tee -a artifacts/migration-upgrade.log
