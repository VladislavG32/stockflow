#!/usr/bin/env bash
# SSH сверяет известный ключ сервера. Артефакт читается как данные, не как shell-код.
set -Eeuo pipefail
bash scripts/ci/preflight.sh deploy
target=${1:?stage or prod}
[[ "$target" == stage || "$target" == prod ]] || exit 1
file=incoming/release.env
[[ -f "$file" ]] || { echo 'Нет артефакта успешной публикации' >&2; exit 1; }
app=$(sed -n 's/^APP_IMAGE=//p' "$file")
migrator=$(sed -n 's/^MIGRATOR_IMAGE=//p' "$file")
sha=$(sed -n 's/^RELEASE_SHA=//p' "$file")
[[ "$sha" =~ ^[a-f0-9]{40}$ && "$sha" == "$(git rev-parse HEAD)" ]] || exit 1
for image in "$app" "$migrator"; do
  [[ "$image" =~ ^[a-z0-9_./-]+@sha256:[a-f0-9]{64}$ ]] || exit 1
done
remote="stockflow-$target"
path="/opt/stockflow-ci/releases/$sha"
ssh -o BatchMode=yes -o StrictHostKeyChecking=yes "$remote" "mkdir -p '$path'"
git archive HEAD | ssh -o BatchMode=yes -o StrictHostKeyChecking=yes "$remote" "tar -xf - -C '$path'"
ssh -o BatchMode=yes -o StrictHostKeyChecking=yes "$remote" "cd '$path' && bash scripts/ops/deploy.sh '$target' '$app' '$migrator' '$sha'"
