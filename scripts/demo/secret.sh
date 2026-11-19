#!/usr/bin/env bash
set -Eeuo pipefail
# Каталог должен находиться внутри общего пути агента и Docker-хоста.
mkdir -p artifacts
temp=$(mktemp -d "$PWD/artifacts/secret-demo.XXXXXX")
trap 'rm -rf -- "$temp"' EXIT
printf 'STOCKFLOW_DEMO_%s\n' 'ABCDEFGHIJKLMNOPQRST' > "$temp/demo.txt"
code=0
output=$(docker run --rm -v "$temp:/demo:ro" -v "$PWD/.gitleaks.toml:/config:ro" \
  zricethezav/gitleaks:v8.30.1 dir /demo --config /config \
  --redact=100 --exit-code=1 --no-color --verbose 2>&1) || code=$?
printf '%s\n' "$output"
[[ "$code" == 1 ]] || { echo "Expected exit code 1, got $code" >&2; exit 1; }
[[ "$output" == *stockflow-training-marker* && "$output" == */demo/demo.txt* ]] || {
  echo 'Expected the synthetic marker in demo.txt' >&2
  exit 1
}
echo "Synthetic marker detected (Gitleaks exit code: $code)"
