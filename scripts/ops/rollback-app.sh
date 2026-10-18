#!/usr/bin/env bash
# Ручной возврат последней версии приложения после успешной доставки.
# Только для обратно совместимых добавочных миграций. База остаётся текущей.
set -Eeuo pipefail
source scripts/ops/common.sh
exec 9>/opt/stockflow-ci/state/deploy.lock
flock -n 9 || exit 1
export APP_IMAGE MIGRATOR_IMAGE
APP_IMAGE=$(cat /opt/stockflow-ci/state/previous-image.txt)
[[ "$APP_IMAGE" =~ ^sha256:[a-f0-9]{64}$ ]] || exit 1
MIGRATOR_IMAGE=$(sed -n 's/^MIGRATOR_IMAGE=//p' /opt/stockflow-ci/state/current.env)
release=("${base[@]}" -f "$PWD/compose.release.yaml")
"${release[@]}" up -d --no-deps app
bash scripts/ops/wait-ready.sh "${release[@]}"
echo 'Предыдущий образ восстановлен; БД не изменялась'
