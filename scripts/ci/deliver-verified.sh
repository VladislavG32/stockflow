#!/usr/bin/env bash
set -Eeuo pipefail
root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
source "$root/scripts/ci/release-lib.sh"
target=${1:?stage or prod}
[[ "$target" == stage || "$target" == prod ]]
[[ "${CI_BRANCH:?}" == dev || "$CI_BRANCH" == refs/heads/dev ]]
revision=$(git -C "$root" rev-parse HEAD)
input="$root/incoming/test"
operation=apply
plan=
if [[ "$target" == stage ]]; then
  read_release "$root/incoming/release/release.env"
else
  input="$root/incoming/stage"
  read_release "$input/release.env"
  [[ "${PROD_RELEASE_SHA:?}" == "$revision" ]] || fail 'Запрошенный SHA отличается от checkout'
  operation=${PROD_OPERATION:-plan}
  plan=${PROD_PLAN:-}
  [[ "$operation" == plan || "$operation" == apply ]]
  if [[ "$operation" == apply ]]; then
    [[ "$plan" =~ ^prod-$revision\.[a-zA-Z0-9]+:[a-f0-9]{64}$ ]] || fail 'Требуется проверенный и подтверждённый план'
  fi
fi
[[ "$RELEASE_SHA" == "$revision" ]] || fail 'Release другого snapshot'
cmp "$root/database/schema/schema.sql" "$input/schema.sql"
cmp "$root/database/schema/migration-history.txt" "$input/history.txt"
mapfile -t references < <(printf '%s\n' schema.sql history.txt prefix-{1,2,3}.schema.sql)
for name in "${references[@]}"; do [[ -s "$input/$name" ]]; done
bash "$root/scripts/ci/preflight.sh" deploy
remote="stockflow-$target"
path="/opt/stockflow-ci/releases/$RELEASE_SHA"
ssh_opts=(-o BatchMode=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=10 -o ServerAliveInterval=15 -o ServerAliveCountMax=3)
if [[ "$target" == prod ]]; then
  ssh "${ssh_opts[@]}" stockflow-stage "bash '$path/scripts/ops/assert-stage-release.sh' '$RELEASE_SHA' '$APP_IMAGE' '$MIGRATOR_IMAGE'"
fi
ssh "${ssh_opts[@]}" "$remote" "umask 077; mkdir -p '$path/reference'"
git -C "$root" archive HEAD | ssh "${ssh_opts[@]}" "$remote" "tar -m -xf - -C '$path'"
tar -C "$input" -cf - "${references[@]}" | ssh "${ssh_opts[@]}" "$remote" "tar -m -xf - -C '$path/reference'"
mkdir -p "$root/artifacts"
ssh "${ssh_opts[@]}" "$remote" \
  "bash '$path/scripts/ops/deploy.sh' '$target' '$APP_IMAGE' '$MIGRATOR_IMAGE' '$RELEASE_SHA' '$path/reference' '$operation' '$plan'" \
    | tee "$root/artifacts/deployment.log"
if [[ "$target" == stage ]]; then
  ssh "${ssh_opts[@]}" stockflow-stage "bash '$path/scripts/ops/assert-stage-release.sh' '$RELEASE_SHA' '$APP_IMAGE' '$MIGRATOR_IMAGE'"
  mkdir -p "$root/artifacts/verified"
  cp "$root/incoming/release/release.env" "$root/artifacts/verified/release.env"
  for name in "${references[@]}"; do cp "$input/$name" "$root/artifacts/verified/$name"; done
fi
