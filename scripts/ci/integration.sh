#!/usr/bin/env bash
# Уникальное имя с обязательным префиксом исключает работу с проектом stockflow.
set -Eeuo pipefail
export CI_IMAGE="stockflow-check:$(git rev-parse HEAD)"
project="stockflow-ci-${BUILD_NUMBER:-local}-$$"
[[ "$project" =~ ^stockflow-ci-[a-zA-Z0-9_-]+$ ]] || exit 1
ci=(docker compose -p "$project" -f compose.ci.yaml)
cleanup() {
  code=$?
  "${ci[@]}" logs --no-color > artifacts/integration-compose.log 2>&1 || true
  "${ci[@]}" down --remove-orphans || true
  exit "$code"
}
trap cleanup EXIT
mkdir -p artifacts
"${ci[@]}" build migrate tests
"${ci[@]}" up -d --wait app
"${ci[@]}" run --rm tests
# Эталон создаётся на TEST только из успешно проверенной одноразовой БД.
"${ci[@]}" exec -T db pg_dump -U stockflow -d stockflow_ci --schema-only --no-owner --no-privileges > artifacts/schema.raw.sql
sed -E '/^--/d; /^\\(un)?restrict /d; /^[[:space:]]*$/d' artifacts/schema.raw.sql > artifacts/schema.sql
"${ci[@]}" exec -T db psql -X -U stockflow -d stockflow_ci -At -c 'select hash from drizzle.__drizzle_migrations order by created_at,id' > artifacts/migrations.txt
# Пересоздаём только приложение; сумма операций и номер записи должны сохраниться.
"${ci[@]}" exec -T db psql -U stockflow -d stockflow_ci -c "INSERT INTO materials(code,name,category,unit) VALUES('PERSIST-CI','Проверка сохранности','QA','шт.');"
"${ci[@]}" up -d --no-deps --force-recreate --wait app
"${ci[@]}" exec -T app node -e "fetch('http://127.0.0.1:3000/api/dashboard').then(r=>r.json()).then(d=>{if(!d.materials.some(m=>m.code==='PERSIST-CI'))process.exit(1)})"
# Ошибка настоящей БД: /health жив, /ready и dashboard возвращают 503.
"${ci[@]}" stop db
"${ci[@]}" exec -T app node -e "(async()=>{for(const [p,s] of [['health',200],['ready',503],['dashboard',503]]){const r=await fetch('http://127.0.0.1:3000/api/'+p);if(r.status!==s)throw Error(p+': '+r.status)}})().catch(e=>{console.error(e);process.exit(1)})"
