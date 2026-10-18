#!/usr/bin/env bash
# Этот шаг имеет секреты и запускается только после проверок доверенных dev/prod.
set -Eeuo pipefail
: "${CI_BRANCH:?}" "${DOCKERHUB_USER:?}" "${DOCKERHUB_TOKEN:?}" "${IMAGE_REPO:?}"
case "$CI_BRANCH" in dev|prod) ;; *) echo 'Публикация разрешена только dev/prod' >&2; exit 1;; esac
[[ "$IMAGE_REPO" =~ ^[a-z0-9_-]+/[a-z0-9_-]+$ ]] || exit 1
sha=$(git rev-parse HEAD)
tag="$CI_BRANCH-$sha"
# Временный config удаляется даже при ошибке; токен не попадает в командную строку.
export DOCKER_CONFIG
DOCKER_CONFIG=$(mktemp -d)
trap 'rm -rf -- "$DOCKER_CONFIG"' EXIT
printf '%s' "$DOCKERHUB_TOKEN" | docker login -u "$DOCKERHUB_USER" --password-stdin
for target in runner migrator; do
  suffix=''; [[ "$target" != migrator ]] || suffix='-migrator'
  docker build --target "$target" --label "org.opencontainers.image.revision=$sha" -t "$IMAGE_REPO:$tag$suffix" .
  docker push "$IMAGE_REPO:$tag$suffix"
  docker pull "$IMAGE_REPO:$tag$suffix"
  digest=$(docker image inspect "$IMAGE_REPO:$tag$suffix" --format '{{index .RepoDigests 0}}')
  [[ "$digest" =~ @sha256:[a-f0-9]{64}$ ]] || exit 1
  if [[ "$target" == runner ]]; then app="$digest"; else migrator="$digest"; fi
done
mkdir -p artifacts
printf 'APP_IMAGE=%s\nMIGRATOR_IMAGE=%s\nRELEASE_SHA=%s\n' "$app" "$migrator" "$sha" > artifacts/release.env
