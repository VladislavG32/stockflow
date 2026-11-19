#!/usr/bin/env bash
set -Eeuo pipefail
root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
source "$root/scripts/ci/release-lib.sh"
expected_target=${1:?stage or prod}
[[ "$expected_target" == stage || "$expected_target" == prod ]] || fail 'Неизвестный стенд'
export APP_IMAGE=${2:?} MIGRATOR_IMAGE=${3:?}
release_sha=${4:?}
reference=${5:-}
operation=${6:-apply}
approved_plan=${7:-}
if [[ "$expected_target" == prod ]]; then
  [[ -n "$reference" ]] || fail 'PROD требует проверенный артефакт схемы STAGE'
fi
valid_digest "$APP_IMAGE" && valid_digest "$MIGRATOR_IMAGE" || fail 'Требуются digest образов'
[[ "${APP_IMAGE%@*}" == "${MIGRATOR_IMAGE%@*}" && "$release_sha" =~ ^[a-f0-9]{40}$ ]] || fail 'Неверный release'
bash "$root/scripts/ci/preflight.sh" deploy
source "$root/scripts/ops/common.sh"
release=("${base[@]}" -f "$root/compose.release.yaml")
app_id=$("${base[@]}" ps -q app)
[[ -n "$app_id" ]] || fail 'Нет исходного приложения для rollback'
previous=$(docker inspect "$app_id" --format '{{.Image}}')
[[ "$previous" =~ ^sha256:[a-f0-9]{64}$ ]] || fail 'Неверный исходный image ID'
previous_sha=$(docker image inspect "$previous" --format '{{index .Config.Labels "org.opencontainers.image.revision"}}')
# У старого образа ЛР3 label может отсутствовать. Не выдумываем SHA.
[[ "$previous_sha" =~ ^[a-f0-9]{40}$ ]] || previous_sha=unknown
"${release[@]}" config --quiet
for image in "$APP_IMAGE" "$MIGRATOR_IMAGE"; do
  docker pull "$image"
  revision=$(docker image inspect "$image" --format '{{index .Config.Labels "org.opencontainers.image.revision"}}')
  [[ "$revision" == "$release_sha" ]] || fail 'Образ другого snapshot'
done
if [[ -n "$reference" ]]; then
  source "$root/scripts/ops/migrate-verified.sh" "$reference" "$operation" "$approved_plan"
fi
changed=0
rollback() {
  code=$?
  trap - EXIT INT TERM
  if (( code != 0 && changed == 1 )); then
    echo 'Ошибка доставки: возвращаем предыдущий app image' >&2
    export APP_IMAGE=$previous
    if "${release[@]}" up -d --no-deps --no-build --pull never app && bash "$root/scripts/ops/wait-ready.sh" "${release[@]}" && verify_app_image && check_database; then
      echo 'Rollback проверен; PostgreSQL сохранён' >&2
    else
      echo 'ОШИБКА ROLLBACK: требуется проверка оператора, тома не удалять' >&2
      exit 2
    fi
  fi
  exit "$code"
}
trap rollback EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
changed=1
"${release[@]}" up -d --no-deps --no-build --pull never app
bash "$root/scripts/ops/wait-ready.sh" "${release[@]}"
verify_app_image
check_database
if [[ -n "$reference" ]]; then
  "${release[@]}" exec -T app node --input-type=module < "$root/scripts/ops/check-release-app.mjs"
fi
printf 'APP_IMAGE=%s\nRELEASE_SHA=%s\n' "$previous" "$previous_sha" > "$state/previous.env.tmp"
mv "$state/previous.env.tmp" "$state/previous.env"
printf 'APP_IMAGE=%s\nMIGRATOR_IMAGE=%s\nRELEASE_SHA=%s\n' "$APP_IMAGE" "$MIGRATOR_IMAGE" "$release_sha" > "$state/current.env.tmp"
mv "$state/current.env.tmp" "$state/current.env"
changed=0
echo "Готово: ${TARGET^^} $release_sha"
