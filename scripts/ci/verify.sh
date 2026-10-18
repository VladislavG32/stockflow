#!/usr/bin/env bash
# Единственная последовательность проверок для FEATURE/FIX/DEV/PROD.
# Первый ненулевой exit code запрещает публикацию и доставку.
set -Eeuo pipefail
mkdir -p artifacts
bash scripts/ci/preflight.sh build
bash scripts/ci/static.sh
bash scripts/ci/sql.sh
docker run --rm --memory=2300m -v "$PWD:$PWD" -w "$PWD" \
  node:24-bookworm-slim bash -ec 'set -o pipefail; npm ci; npm run lint; npm run typecheck; npm run test:infra; npm run test:coverage 2>&1 | tee artifacts/unit-coverage.txt; npm run build'
bash scripts/ci/bundle.sh
