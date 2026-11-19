#!/usr/bin/env bash
set -Eeuo pipefail
mkdir -p artifacts
# Сканируем снапшот коммита. Локальные настройки, зависимости и отчёты вне области проверки.
snapshot=$(mktemp -d "$PWD/artifacts/gitleaks-source.XXXXXX")
trap 'rm -rf -- "$snapshot"' EXIT
git archive HEAD | tar -x -C "$snapshot"
docker run --rm -v "$snapshot:/source:ro" -v "$PWD/artifacts:/reports" \
  zricethezav/gitleaks:v8.30.1 dir /source --config /source/.gitleaks.toml \
  --redact=100 --exit-code=1 --report-format json --report-path /reports/gitleaks.json
