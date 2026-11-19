#!/usr/bin/env bash
set -Eeuo pipefail
mkdir -p artifacts
docker run --rm --memory=512m -v "$PWD:$PWD" -w "$PWD" node:24-bookworm-slim \
  bash -ec 'node --import tsx --test --test-reporter=spec --test-reporter-destination=stderr --test-reporter=junit --test-reporter-destination=stdout tests/*.test.ts' \
  2> >(tee artifacts/unit.log >&2) | bash scripts/ci/junit.sh > artifacts/unit.junit.xml
