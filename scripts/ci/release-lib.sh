#!/usr/bin/env bash
# release.env читается как данные: никогда не source/eval.
set -Eeuo pipefail
fail() { echo "$*" >&2; exit 1; }
valid_digest() { [[ "$1" =~ ^[a-z0-9_-]+/[a-z0-9_-]+@sha256:[a-f0-9]{64}$ ]]; }
read_release() {
  local file=$1 line key value seen='|'
  [[ -f "$file" ]] || fail 'Нет release.env'
  APP_IMAGE= MIGRATOR_IMAGE= RELEASE_SHA=
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ "$line" == *=* ]] || fail 'Неверная строка release.env'
    key=${line%%=*}; value=${line#*=}
    [[ "$seen" != *"|$key|"* ]] || fail 'Повтор поля release.env'
    seen+="$key|"
    case "$key" in
      APP_IMAGE) [[ -z "$APP_IMAGE" ]] || fail 'Повтор APP_IMAGE'; APP_IMAGE=$value ;;
      MIGRATOR_IMAGE) [[ -z "$MIGRATOR_IMAGE" ]] || fail 'Повтор MIGRATOR_IMAGE'; MIGRATOR_IMAGE=$value ;;
      RELEASE_SHA) [[ -z "$RELEASE_SHA" ]] || fail 'Повтор RELEASE_SHA'; RELEASE_SHA=$value ;;
      *) fail 'Неизвестное поле release.env' ;;
    esac
  done < "$file"
  valid_digest "$APP_IMAGE" && valid_digest "$MIGRATOR_IMAGE" || fail 'Требуются неизменяемые Docker Hub digest'
  [[ "${APP_IMAGE%@*}" == "${MIGRATOR_IMAGE%@*}" ]] || fail 'Образы из разных репозиториев'
  [[ "$RELEASE_SHA" =~ ^[a-f0-9]{40}$ ]] || fail 'Неверный RELEASE_SHA'
}
