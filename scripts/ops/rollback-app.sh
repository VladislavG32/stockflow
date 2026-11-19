#!/usr/bin/env bash
# Ручной возврат приложения; миграции и операции с томами не выполняются.
set -Eeuo pipefail
root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
bash "$root/scripts/ci/preflight.sh" deploy
source "$root/scripts/ops/common.sh"
APP_IMAGE=$(sed -n 's/^APP_IMAGE=//p' "$state/previous.env")
previous_sha=$(sed -n 's/^RELEASE_SHA=//p' "$state/previous.env")
[[ "$APP_IMAGE" =~ ^sha256:[a-f0-9]{64}$ && ( "$previous_sha" =~ ^[a-f0-9]{40}$ || "$previous_sha" == unknown ) ]] || exit 1
# migrate не запускается, но Compose должен разрешить переменную override.
export APP_IMAGE MIGRATOR_IMAGE=$APP_IMAGE
release=("${base[@]}" -f "$root/compose.release.yaml")
"${release[@]}" config --quiet
"${release[@]}" up -d --no-deps --no-build --pull never app
bash "$root/scripts/ops/wait-ready.sh" "${release[@]}"
verify_app_image
check_database
printf 'APP_IMAGE=%s\nRELEASE_SHA=%s\n' "$APP_IMAGE" "$previous_sha" > "$state/current.env.tmp"
mv "$state/current.env.tmp" "$state/current.env"
echo 'Предыдущий образ восстановлен и проверен; PostgreSQL сохранён'
