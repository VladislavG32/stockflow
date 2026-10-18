#!/usr/bin/env bash
# Запуск только на выбранном Linux CI. Существующий builder не пересоздаём.
set -Eeuo pipefail
export BUILDX_CONFIG=${BUILDX_CONFIG:-/opt/stockflow-ci/buildx}
bash scripts/ci/preflight.sh build
if ! docker buildx inspect stockflow-builder >/dev/null 2>&1; then
  docker buildx create --name stockflow-builder --driver docker-container --driver-opt memory=3g
fi
docker buildx inspect stockflow-builder --bootstrap
