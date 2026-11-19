#!/usr/bin/env bash
# Доверенная конфигурация администратора вне Git, chmod 600.
set -Eeuo pipefail
config_dir=${STOCKFLOW_CONFIG_DIR:-/opt/stockflow-ci}
source "$config_dir/target.env"
: "${DEPLOY_DIR:?}" "${PROJECT:?}" "${EXPECTED_DB_VOLUME:?}" "${TARGET:?}" "${TARGET_HOST:?}"
[[ "$TARGET" == "${expected_target:-stage}" && "$(hostname -s)" == "$TARGET_HOST" ]] || { echo 'Неверный стенд/hostname' >&2; exit 1; }
[[ "$PROJECT" =~ ^[a-z0-9][a-z0-9_-]*$ && "$DEPLOY_DIR" == /* ]] || exit 1
[[ -f "$DEPLOY_DIR/compose.yaml" && -f "$DEPLOY_DIR/.env" ]] || exit 1
state="$config_dir/state"
umask 077
mkdir -p "$state"
exec 9>"$state/deploy.lock"
flock -n 9 || { echo 'Уже выполняется доставка/rollback' >&2; exit 1; }
base=(docker compose --project-directory "$DEPLOY_DIR" --env-file "$DEPLOY_DIR/.env" -p "$PROJECT" -f "$DEPLOY_DIR/compose.yaml")
check_database() {
  local id volume
  id=$("${base[@]}" ps -q db)
  [[ -n "$id" ]] || { echo 'Исходная БД не найдена' >&2; return 1; }
  volume=$(docker inspect "$id" --format '{{range .Mounts}}{{if eq .Destination "/var/lib/postgresql/data"}}{{.Name}}{{end}}{{end}}')
  [[ "$volume" == "$EXPECTED_DB_VOLUME" ]] || { echo 'Не совпадает том PostgreSQL' >&2; return 1; }
  if [[ -n "${original_db:-}" && "$id" != "$original_db" ]]; then echo 'Контейнер БД изменился' >&2; return 1; fi
  original_db=$id
}
check_database
verify_app_image() {
  local id actual
  id=$("${base[@]}" ps -q app)
  actual=$(docker inspect "$id" --format '{{.Image}}')
  [[ "$actual" == "$(docker image inspect "$APP_IMAGE" --format '{{.Id}}')" ]] || { echo 'Запущен другой образ' >&2; return 1; }
}
