#!/usr/bin/env bash
# Squawk анализирует PostgreSQL DDL, локальная политика запрещает потерю данных.
# Отчёт text удобен для защиты; ненулевой код блокирует весь Verify.
set -Eeuo pipefail
mkdir -p artifacts
docker run --rm -v "$PWD:$PWD" -w "$PWD" node:24-bookworm-slim node scripts/db/sql-policy.mjs
docker run --rm -v "$PWD:/data" -w /data ghcr.io/sbdchd/squawk:2.70.0 \
  --config /data/.squawk.toml drizzle/*.sql 2>&1 | tee artifacts/squawk.txt
