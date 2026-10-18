#!/usr/bin/env bash
# Демонстрация без настоящего секрета, вне Git и рабочих веток.
set -Eeuo pipefail
temp=$(mktemp -d)
trap 'rm -rf -- "$temp"' EXIT
printf 'STOCKFLOW_DEMO_%s\n' 'ABCDEFGHIJKLMNOPQRST' > "$temp/demo.txt"
set +e
docker run --rm -v "$temp:/demo" -v "$PWD/.gitleaks.toml:/config:ro" zricethezav/gitleaks:v8.30.1 dir /demo --config /config --redact
code=$?
set -e
[[ "$code" == 1 ]] || { echo "Ожидалась находка (1), получено $code" >&2; exit 1; }
echo 'Демонстрация подтверждена: синтетическая метка обнаружена'
