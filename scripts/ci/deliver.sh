#!/usr/bin/env bash
set -Eeuo pipefail
root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
source "$root/scripts/ci/release-lib.sh"
[[ "${1:-}" == stage ]] || fail 'ЛР5 допускает только stage'
[[ "${CI_BRANCH:?Set CI_BRANCH}" == dev || "$CI_BRANCH" == refs/heads/dev ]] || fail 'Доставка разрешена только из dev'
read_release "$root/incoming/release.env"
[[ "$RELEASE_SHA" == "$(git -C "$root" rev-parse HEAD)" ]] || fail 'Release другого snapshot'
bash "$root/scripts/ci/preflight.sh" deploy
remote=stockflow-stage
path="/opt/stockflow-ci/releases/$RELEASE_SHA"
ssh_opts=(-o BatchMode=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=10 -o ServerAliveInterval=15 -o ServerAliveCountMax=3)
# Архив содержит только отслеживаемый код проверенного snapshot, без .env и ключей.
ssh "${ssh_opts[@]}" "$remote" "mkdir -p '$path'"
git -C "$root" archive HEAD | ssh "${ssh_opts[@]}" "$remote" "tar -xf - -C '$path'"
ssh "${ssh_opts[@]}" "$remote" "cd '$path' && bash scripts/ops/deploy.sh stage '$APP_IMAGE' '$MIGRATOR_IMAGE' '$RELEASE_SHA'"
