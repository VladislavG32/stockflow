#!/usr/bin/env bash
# Массив команды compose передаётся аргументами, без eval.
set -Eeuo pipefail
for (( attempt=1; attempt<=60; attempt++ )); do
  if "$@" exec -T app node -e "fetch('http://127.0.0.1:3000/api/ready',{signal:AbortSignal.timeout(3000)}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"; then
    exit 0
  fi
  sleep 2
done
echo 'Приложение не стало готовым: проверьте compose logs app' >&2
exit 1
