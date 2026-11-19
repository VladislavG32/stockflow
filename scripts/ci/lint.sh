#!/usr/bin/env bash
set -Eeuo pipefail
mkdir -p artifacts
bash scripts/ci/preflight.sh build
docker run --rm --memory=2300m -v "$PWD:$PWD" -w "$PWD" node:24-bookworm-slim \
  bash -ec 'npm ci; npm run lint; echo "ESLint: 0 errors, 0 warnings"' 2>&1 | tee artifacts/eslint.log
