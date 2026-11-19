#!/usr/bin/env bash
set -Eeuo pipefail
mkdir -p artifacts
exec > >(tee artifacts/squawk.txt) 2>&1

if [[ -n ${SQUAWK_BIN:-} ]]; then
  squawk=("$SQUAWK_BIN")
else
  squawk=(docker run --rm -v "$PWD:/data:ro" -w /data ghcr.io/sbdchd/squawk:2.70.0)
fi
"${squawk[@]}" --version

check() {
  local file=$1 rc=0 report allowed
  shift
  printf '\n--- %s ---\n' "$file"
  report=$("${squawk[@]}" --pg-version 17.0 --reporter gcc "$@" "$file" 2>&1) || rc=$?
  printf '%s\n' "$report"
  if (( rc == 0 )); then return 0; fi
  if (( rc != 1 )) || [[ -z "$report" ]]; then return 1; fi

  # Existing migrations remain byte-for-byte identical. These advisories were
  # present before Lab 8, and their rules still run for every new migration.
  case "$file:$(git hash-object -- "$file")" in
    drizzle/0000_rainy_iceman.sql:f53d3bf877be47b2c405ef24c3b07611fab73e75|\
    drizzle/0001_lab7_catalog_fields.sql:33b3ae1305b20b30431e566ceaa10498c0e12ac8)
      allowed='prefer-bigint-over-int|prefer-identity|prefer-text-field|require-lock-timeout|require-statement-timeout' ;;
    database/schema/schema.sql:4a6da81069f09890de72b5de2d0aba318eff5d62)
      # pg_dump emits constraints and ordinary indexes for an empty restore.
      # Acceptance compares the full snapshot to a clean migrated database.
      allowed='prefer-robust-stmts|prefer-bigint-over-int|prefer-text-field|constraint-missing-not-valid|adding-serial-primary-key-field|disallowed-unique-constraint|require-concurrent-index-creation|adding-foreign-key-constraint' ;;
    *) return 1 ;;
  esac
  if grep -Evq ": warning: ($allowed) " <<< "$report"; then return 1; fi
  printf 'Known findings in a reviewed SQL file.\n'
}

result=0
mapfile -d '' -t files < <(git ls-files -z -- '*.sql')
(( ${#files[@]} > 0 ))
for file in "${files[@]}"; do
  case "$file" in
    database/schema/*) check "$file" || result=1 ;;
    *) check "$file" --assume-in-transaction || result=1 ;;
  esac
done
printf '\nSQL Security: %s files, status %s\n' "${#files[@]}" "$result"
exit "$result"
