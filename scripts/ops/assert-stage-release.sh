#!/usr/bin/env bash
set -Eeuo pipefail
root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
source "$root/scripts/ci/release-lib.sh"
release_sha=${1:?}
app_image=${2:?}
migrator_image=${3:?}
[[ "$release_sha" =~ ^[a-f0-9]{40}$ ]]
valid_digest "$app_image" && valid_digest "$migrator_image"
expected_target=stage
source "$root/scripts/ops/common.sh"
printf 'APP_IMAGE=%s\nMIGRATOR_IMAGE=%s\nRELEASE_SHA=%s\n' "$app_image" "$migrator_image" "$release_sha" |
  cmp - "$state/current.env"
APP_IMAGE=$app_image verify_app_image
docker exec "$original_db" sh -ec 'exec pg_dump --schema-only --no-owner --no-privileges -U "$POSTGRES_USER" "$POSTGRES_DB"' |
  bash "$root/scripts/db/normalize-schema.sh" | cmp - "$root/database/schema/schema.sql"
docker exec "$original_db" sh -ec 'exec psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atqc "select created_at, hash from drizzle.__drizzle_migrations order by id"' |
  cmp - "$root/database/schema/migration-history.txt"
"${base[@]}" exec -T app node --input-type=module < "$root/scripts/ops/check-release-app.mjs"
printf 'STAGE подтверждена: SHA %s | %s\n' "$release_sha" "$app_image"
