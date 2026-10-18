#!/usr/bin/env bash
# ESLint уже запускается в verify.sh. Любая находка Gitleaks останавливает сборку.
# JSON с --redact сохраняет местоположение, но скрывает найденное значение.
set -Eeuo pipefail
mkdir -p artifacts
docker run --rm -v "$PWD:/repo" zricethezav/gitleaks:v8.30.1 \
  git /repo --config /repo/.gitleaks.toml --redact --report-format json --report-path /repo/artifacts/gitleaks.json
