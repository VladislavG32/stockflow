#!/usr/bin/env bash
# Node emits top-level test cases directly in <testsuites>. The TeamCity JUnit
# importer expects the test cases to belong to a named <testsuite>.
set -Eeuo pipefail
sed -e 's/^<testsuites>$/<testsuite name="StockFlow">/' \
    -e 's@^</testsuites>$@</testsuite>@'
