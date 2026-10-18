#!/usr/bin/env bash
# ЛР8, первая фаза: оператор вручную запускает мигратор на STAGE после TEST.
# Drizzle фиксирует применённый SQL в своём журнале, повторный запуск безопасен.
set -Eeuo pipefail
source scripts/ops/common.sh
[[ "$TARGET" == stage && "${CONFIRM_MANUAL_STAGE:-}" == stage ]] || exit 1
: "${APP_IMAGE:?}" "${MIGRATOR_IMAGE:?}"
mkdir -p /opt/stockflow-ci/state
exec 9>/opt/stockflow-ci/state/deploy.lock
flock -n 9 || exit 1
bash scripts/db/backup.sh /opt/stockflow-ci/backups
bash scripts/db/export.sh /opt/stockflow-ci/state/before-manual
docker compose --project-directory "$DEPLOY_DIR" --env-file "$DEPLOY_DIR/.env" -p "$PROJECT" -f "$DEPLOY_DIR/compose.yaml" -f "$PWD/compose.release.yaml" run --rm --no-deps migrate
bash scripts/db/export.sh /opt/stockflow-ci/state/after-manual
