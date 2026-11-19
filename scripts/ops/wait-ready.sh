#!/usr/bin/env bash
# Readiness проверяет HTTP и контракт ответа, включая доступность PostgreSQL.
set -Eeuo pipefail
[[ $# -gt 0 ]] || { echo 'Нет команды compose' >&2; exit 1; }
for (( attempt=1; attempt<=60; attempt++ )); do
  if "$@" exec -T app node -e "fetch('http://127.0.0.1:3000/api/ready',{signal:AbortSignal.timeout(3000)}).then(async r=>{const b=await r.json();process.exit(r.ok&&b.status==='ok'&&b.service==='stockflow'&&b.database==='ok'?0:1)}).catch(()=>process.exit(1))"; then
    exit 0
  fi
  sleep 2
done
echo 'Приложение не готово: проверьте compose logs app' >&2
exit 1
