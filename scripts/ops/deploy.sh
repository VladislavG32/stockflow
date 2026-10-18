#!/usr/bin/env bash
# Меняется только приложение; существующий db и его том сохраняются.
set -Eeuo pipefail
root=$(pwd)
bash scripts/ci/preflight.sh deploy
source "$root/scripts/ops/common.sh"
[[ "${1:?}" == "$TARGET" && ( "$TARGET" == stage || "$TARGET" == prod ) ]] || exit 1
export APP_IMAGE=${2:?} MIGRATOR_IMAGE=${3:?}
release_sha=${4:?}
[[ "$release_sha" =~ ^[a-f0-9]{40}$ ]] || exit 1
mkdir -p /opt/stockflow-ci/state
exec 9>/opt/stockflow-ci/state/deploy.lock
flock -n 9 || { echo 'Уже выполняется доставка' >&2; exit 1; }
release=("${base[@]}" -f "$root/compose.release.yaml")
app_id=$("${base[@]}" ps -q app)
[[ -n "$app_id" ]] || exit 1
previous=$(docker inspect "$app_id" --format '{{.Image}}')
"${release[@]}" config --quiet
docker pull "$APP_IMAGE"
docker pull "$MIGRATOR_IMAGE"
# Первая фаза ЛР8 требует уже выполненной ручной миграции. Вторая фаза
# явно включается оператором в локальном target.env после защиты ручного этапа.
case "${MIGRATION_MODE:?Set manual or auto}" in
  manual)
    [[ "$TARGET" != prod ]] || exit 1
    bash scripts/db/export.sh /opt/stockflow-ci/state/manual-check
    cmp reference/schema.sql /opt/stockflow-ci/state/manual-check/schema.sql
    cmp reference/migrations.txt /opt/stockflow-ci/state/manual-check/migrations.txt
    ;;
  auto) bash scripts/db/prepare-migration.sh ;;
  *) exit 1 ;;
esac
# При ошибке readiness возвращаем образ; БД не откатываем и не удаляем.
changed=0
rollback() {
  code=$?
  if (( code != 0 && changed == 1 )); then
    echo 'Обновление не прошло. Возвращаем предыдущий образ.' >&2
    APP_IMAGE="$previous" "${release[@]}" up -d --no-deps app || true
  fi
  exit "$code"
}
trap rollback EXIT
changed=1
"${release[@]}" up -d --no-deps app
bash "$root/scripts/ops/wait-ready.sh" "${release[@]}"
printf '%s\n' "$previous" > /opt/stockflow-ci/state/previous-image.txt
printf 'APP_IMAGE=%s\nMIGRATOR_IMAGE=%s\nRELEASE_SHA=%s\n' "$APP_IMAGE" "$MIGRATOR_IMAGE" "$release_sha" > /opt/stockflow-ci/state/current.env.tmp
mv /opt/stockflow-ci/state/current.env.tmp /opt/stockflow-ci/state/current.env
echo "Готово: $TARGET $release_sha"
