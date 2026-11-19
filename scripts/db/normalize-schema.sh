#!/usr/bin/env bash
set -Eeuo pipefail
# Remove the pg_dump session nonce and version comments. Keep all object DDL.
sed -E '/^\\(un)?restrict [A-Za-z0-9]+\r?$/d; /^-- Dumped (from database|by pg_dump) version /d; s/\r$//'
