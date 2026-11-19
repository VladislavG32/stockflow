#!/usr/bin/env bash
set -Eeuo pipefail
mkdir -p artifacts
docker run --rm --memory=512m -v "$PWD:$PWD" -w "$PWD" node:24-bookworm-slim \
  bash -ec 'node --import tsx --test --test-reporter=spec --test-reporter-destination=stderr --test-reporter=junit --test-reporter-destination=stdout tests/*.test.ts' \
  > artifacts/unit.junit.xml 2> >(tee artifacts/unit.log >&2)
