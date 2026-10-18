#!/usr/bin/env bash
# Единственная последовательность проверок для FEATURE/FIX/DEV/PROD.
# Первый ненулевой exit code запрещает публикацию и доставку.
set -Eeuo pipefail
mkdir -p artifacts
docker info >/dev/null
bash scripts/ci/static.sh
bash scripts/ci/sql.sh
docker run --rm --memory=2300m -v "$PWD:$PWD" -w "$PWD" \
  node:24-bookworm-slim bash -ec 'npm ci && npm run lint && npm run typecheck && npm test && npm run build'
docker build --target runner -t "stockflow-check:$(git rev-parse HEAD)" .
bash scripts/ci/integration.sh
