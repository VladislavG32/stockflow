#!/usr/bin/env bash
# SSH сверяет известный ключ сервера. Артефакт читается как данные, не как shell-код.
set -Eeuo pipefail
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
if [[ "$target" == prod ]]; then
  # PROD получает тот же SHA и digest, который уже прошёл STAGE.
  [[ "$(git ls-remote origin refs/heads/prod | cut -f1)" == "$sha" ]] || { echo 'prod должен указывать на проверенный SHA STAGE (fast-forward)' >&2; exit 1; }
fi
ssh -o BatchMode=yes -o StrictHostKeyChecking=yes "$remote" "mkdir -p '$path/reference'"
git archive HEAD | ssh -o BatchMode=yes -o StrictHostKeyChecking=yes "$remote" "tar -xf - -C '$path'"
scp -o BatchMode=yes -o StrictHostKeyChecking=yes reference/schema.sql reference/migrations.txt "$remote:$path/reference/"
ssh -o BatchMode=yes -o StrictHostKeyChecking=yes "$remote" "cd '$path' && bash scripts/ops/deploy.sh '$target' '$app' '$migrator' '$sha'"
if [[ "$target" == stage ]]; then
  mkdir -p artifacts/stage-reference
  ssh -o BatchMode=yes -o StrictHostKeyChecking=yes "$remote" "cd '$path' && bash scripts/db/export.sh '$path/stage-reference'"
  scp -o BatchMode=yes -o StrictHostKeyChecking=yes "$remote:$path/stage-reference/schema.sql" "$remote:$path/stage-reference/migrations.txt" artifacts/stage-reference/
  cp incoming/release.env artifacts/release.env
fi
