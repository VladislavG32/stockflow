#!/usr/bin/env bash
# Только упаковка уже собранных образов; лимит TeamCity 300 МБ не меняется.
set -Eeuo pipefail
dir=${1:-artifacts}
part_bytes=${STOCKFLOW_BUNDLE_PART_BYTES:-200000000}
[[ "$part_bytes" =~ ^[1-9][0-9]{0,8}$ && "$part_bytes" -le 200000000 ]] || {
  echo 'Размер фрагмента должен быть от 1 до 200000000 байт' >&2; exit 1;
}
cd -- "$dir"
[[ -s ci-images.tar.gz ]] || exit 1
# Временные части не подходят под artifactRules даже при ошибке split.
work=$(mktemp -d .bundle-XXXXXX)
trap 'rm -rf -- "$work"' EXIT
sha256sum ci-images.tar.gz > "$work/ci-images.sha256"
split -b "$part_bytes" -d -a 6 ci-images.tar.gz "$work/ci-images.tar.gz.part-"
(cd "$work" && sha256sum ci-images.tar.gz.part-* > ci-images.parts.sha256)
# Убираем только устаревшие результаты этого упаковщика.
rm -f -- ci-images.tar.gz.part-* ci-images.parts.sha256 ci-images.sha256
mv -- "$work"/ci-images.* .
# Полный архив не должен попасть в artifacts/* (иначе снова превысит лимит).
rm -- ci-images.tar.gz
