#!/usr/bin/env bash
# TEST выполняет только готовые контейнеры и лёгкие HTTP/SQL-тесты.
# Сборка Next.js, npm ci и docker build на TEST запрещены этой конфигурацией.
set -Eeuo pipefail
bash scripts/ci/preflight.sh test
bash scripts/ci/load-bundle.sh incoming
sha=$(git rev-parse HEAD)
export CI_IMAGE="stockflow-ci-runner:$sha"
export CI_MIGRATOR_IMAGE="stockflow-ci-migrator:$sha"
export CI_TEST_IMAGE="stockflow-ci-test-tools:$sha"
[[ $(docker image inspect "$CI_TEST_IMAGE" --format '{{index .Config.Labels "org.opencontainers.image.revision"}}') == "$sha" ]]
bash scripts/ci/integration.sh
