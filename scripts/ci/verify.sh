#!/usr/bin/env bash
# Сборка только на Linux CI, любая ошибка запрещает дальнейшую цепочку.
set -Eeuo pipefail
# node_modules установлен шагом ESLint в том же чистом checkout.
docker run --rm --memory=2300m -v "$PWD:$PWD" -w "$PWD" node:24-bookworm-slim bash -ec 'npm run typecheck; npm run test:infra; npm test; npm run build'
bash scripts/ci/bundle.sh
