#!/usr/bin/env bash
# Получаем бинарные артефакты только из успешной сборки того же snapshot.
# Никаких source/eval для данных артефакта и никаких rebuild на TEST.
set -Eeuo pipefail
dir=${1:-incoming}
# Имя checksum-файла фиксировано; не исполняем произвольные пути из manifest.
expected=$(awk '$2=="ci-images.tar.gz" {print $1}' "$dir/ci-images.sha256")
[[ "$expected" =~ ^[a-f0-9]{64}$ ]] || exit 1
actual=$(sha256sum "$dir/ci-images.tar.gz" | cut -d' ' -f1)
[[ "$actual" == "$expected" ]] || { echo 'Повреждён архив образов' >&2; exit 1; }
gzip -dc "$dir/ci-images.tar.gz" | docker load
sha=$(git rev-parse HEAD)
for target in runner migrator; do
  revision=$(docker image inspect "stockflow-ci-$target:$sha" --format '{{index .Config.Labels "org.opencontainers.image.revision"}}')
  [[ "$revision" == "$sha" ]] || exit 1
done
