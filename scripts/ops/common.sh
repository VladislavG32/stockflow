#!/usr/bin/env bash
# Конфигурация с chmod 600 вне Git. DEPLOY_DIR — исходный каталог ЛР3.
set -Eeuo pipefail
source /opt/stockflow-ci/target.env
: "${DEPLOY_DIR:?}" "${PROJECT:?}" "${EXPECTED_DB_VOLUME:?}" "${TARGET:?}"
case "$TARGET" in test|stage|prod) ;; *) exit 1 ;; esac
# Ошибка SSH alias/target.env не должна направить доставку на другой стенд.
[[ $(hostname -s) == "stockflow-$TARGET" ]] || { echo 'Hostname не совпадает с TARGET' >&2; exit 1; }
[[ "$PROJECT" =~ ^[a-z0-9_-]+$ && "$DEPLOY_DIR" == /* ]] || exit 1
base=(docker compose --project-directory "$DEPLOY_DIR" --env-file "$DEPLOY_DIR/.env" -p "$PROJECT" -f "$DEPLOY_DIR/compose.yaml")
db_id=$("${base[@]}" ps -q db)
[[ -n "$db_id" ]] || { echo 'База ЛР3 не найдена' >&2; exit 1; }
volume=$(docker inspect "$db_id" --format '{{range .Mounts}}{{if eq .Destination "/var/lib/postgresql/data"}}{{.Name}}{{end}}{{end}}')
[[ "$volume" == "$EXPECTED_DB_VOLUME" ]] || { echo 'Не совпадает том PostgreSQL' >&2; exit 1; }
pgcmd() { "${base[@]}" exec -T db "$@"; }
