#!/usr/bin/env bash
# Все тяжёлые сборки выполняет CI Linux. Архив передаёт ТОТ ЖЕ образ на TEST
# и обратно в Publish через sameChain; feature-образы в Docker Hub не публикуются.
set -Eeuo pipefail
mkdir -p artifacts
sha=$(git rev-parse HEAD)
targets=(runner migrator)
[[ ! -f compose.ci.yaml ]] || targets+=(test-tools)
images=()
for target in "${targets[@]}"; do
  image="stockflow-ci-$target:$sha"
  # Именованный BuildKit на CI ограничен 3 ГБ; настройка описана в LINUX_CI_SETUP_RU.
  docker buildx build --builder stockflow-builder --load --target "$target" --label "org.opencontainers.image.revision=$sha" -t "$image" .
  images+=("$image")
done
docker save "${images[@]}" | gzip -1 > artifacts/ci-images.tar.gz
(cd artifacts && sha256sum ci-images.tar.gz > ci-images.sha256)
