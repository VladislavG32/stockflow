# Лабораторная работа 8 Миграции PostgreSQL

## Цель и все пункты методички

| Пункты | Подготовка | Реальное доказательство на защите |
|---|---|---|
| 1,5 каталог и штатный экспорт | database/schema, pg_dump export.sh | повторить экспорт на TEST, commit и скриншот |
| 2,3 выбор и проверка SQL всех веток | Squawk + sql-policy, Verify | реальный build каждой ветки |
| 4 изменение ПО/схемы | 0001 цена и стоимость | запись с ценой и пересчёт |
| 6 ручная STAGE перед обновлением | manual-stage.sh, отдельная ветка | ручной запуск после TEST, ДО merge DEV |
| 7,8 DEV deploy и проверка | Stage manual mode | CI deploy, столбец и функция |
| 9,10 выбор мигратора, сравнение, auto | Drizzle + rehearsal | сравнение before/rehearsal/after |
| 11 ещё одно изменение | 0002 номер накладной | новый DEV commit, auto update, совпадение схем |
| 12 отдельный PROD | manual Promote Stage, Prod BuildType | сознательный запуск конкретной версии |
| 13,14 backup и проверка | pg_dump custom, restore/checksum | реальный .dump и восстановление на PROD |
| 15 отчёт | эти инструкции и карта проекта | только собственные реальные скриншоты |

Ограничение: текущие TEST/STAGE/PROD ЛР3 заранее не менялись. Локальный экспорт в
репозитории создан реальным pg_dump17.6 из отдельной PostgreSQL17.10, не выдаётся
за экспорт TEST VM. Повторить его на TEST в ходе работы. Прежде чем приступать,
сдать ЛР4–7, сохранить их SHA и убедиться, что LAB3-записи остались.

## Инструменты

| Инструмент | Достоинства | Почему выбран/не выбран |
|---|---|---|
| Squawk | Парсер PostgreSQL, опасные DDL и блокировки | Выбран, бесплатный, понятный CLI |
| SQLFluff | Стиль/синтаксис SQL и dialect postgres | Не основной security-инструмент, избыточен для Drizzle SQL |
| Semgrep SQL/rules | Поиск известных паттернов SQL/инъекций | Не заменяет анализ PostgreSQL DDL и репетицию |
| sql-policy.mjs | Запрет DROP/TRUNCATE/DELETE и опасных привилегий | Дополнительная узкая политика, не полноценный парсер |
| Drizzle migrations | Уже есть schema/journal; SQL версионируется | Оставлен; добавлены lock/statement timeout и hash-проверка |
| Flyway Community | SQL-журнал, checksum validation | Хороший вариант, но второй журнал не нужен |
| Liquibase Community | Changeset, contexts, preconditions | Сложнее текущего задания, XML/YAML-слой не оправдан |

Squawk проверяет все SQL в drizzle, database/post-migrate и database/schema во всех
ветках, где эти каталоги есть. Исходная 0000 неизменна. Анализ получает prelude
таймаутов, фактически задаваемых migrate.mjs, и --assume-in-transaction: Drizzle
действительно оборачивает миграции в транзакцию. Исключены только рекомендации
prefer-identity/prefer-text-field/prefer-bigint-over-int: типы выбраны в ЛР3,
диапазоны ограничены CHECK/Zod. Запреты опасных DDL не выключены. Любая оставшаяся
находка Squawk останавливает Verify. В README схемы dump не называется миграцией.

## Два разных изменения

Первая контрольная ветка `codex/lab8-manual-ready`: только `0001_receipt_price.sql`.
Цена в копейках, nullable. Старое поступление8 не превращается в поступление с ценой0.
5 единиц по12345 коп. →61725 коп. В API отсутствующая цена по умолчанию NULL.
Остаток считается только из количества, не стоимости. CHECK диапазона добавляется
NOT VALID; post-migrate/validate-price.sql запускается ПОСЛЕ COMMIT отдельным запросом.
Новые строки ограничены сразу, исторические затем проверяются с меньшей блокировкой.

Вторая ветка `feature/labs4-8-preparation`: дополнительно `0002_receipt_document.sql`,
необязательный номер накладной. Это отдельный новый commit для автоматического этапа.
Не переносить 0002 одновременно с 0001. Никогда не редактировать уже применённую SQL:
hash-check migrate.mjs остановит такой запуск. Генерация будущих изменений:
`npm run db:generate -- --name осмысленное_имя`, затем review SQL и tests.

## Фаза I TEST и ручная миграция STAGE

Windows, подготовить feature от DEV ЛР7:

```powershell
Set-Location D:\StockFlow
git fetch origin
git switch -c feature/lab8-price origin/dev
git merge --ff-only codex/lab8-manual-ready
git push -u origin feature/lab8-price
```

Если история разошлась после PR merge, сделать обычный merge с проверкой diff.
TeamCity Settings root выбрать codex/lab8-manual-ready, Always current settings.
Verify feature должен собрать образы на CI, затем Acceptance того же SHA
должен проверить цену и PostgreSQL на TEST.
Скачать checks/schema.sql и checks/migrations.txt успешного Acceptance build в reference/
локального checkout. Записать build number и SHA. Это реальный эталон TEST-контура,
а не автоматически обновлённая рабочая stockflow на TEST. Снять скриншот.

На TEST можно экспортировать этот контур до его удаления вручную командами pg_dump
из integration.sh. Автоматическая проверка сохраняет schema.raw.sql/schema.sql и
migrations.txt как build artifacts. Для фиксации штатного экспорта в Git скопировать
реальные artifacts в database/schema и выполнить:

```bash
git add database/schema
git commit -m "docs(lab8): record actual TEST PostgreSQL schema"
git push
```

Обновить SHA/пересобрать Verify после этого коммита. Никаких пользовательских строк
в schema-only нет; всё равно просмотреть файл перед commit.

На STAGE, отдельный checkout; рабочий ~/stockflow не переключать:

```bash
git clone -b feature/lab8-price https://github.com/VladislavG32/stockflow.git ~/stockflow-lab8-manual
cd ~/stockflow-lab8-manual
read -rp 'Полный SHA успешных Verify и Acceptance: ' VERIFIED_SHA
[[ "$VERIFIED_SHA" =~ ^[a-f0-9]{40}$ ]]
git switch --detach "$VERIFIED_SHA"
test ! -f drizzle/0002_receipt_document.sql
# target.env уже настроен в ЛР5. Добавьте MIGRATION_MODE=manual.
nano /opt/stockflow-ci/target.env
mkdir -p /opt/stockflow-ci/{state,backups}
# Скачать checks/ci-images.tar.gz и ci-images.sha256 из успешного Verify на CI
# того же SHA в incoming/. Записать build number; schema взять из Acceptance TEST.
mkdir -p incoming
bash scripts/ci/preflight.sh test
bash scripts/ci/load-bundle.sh incoming
export MIGRATOR_IMAGE="stockflow-ci-migrator:$(git rev-parse HEAD)"
# APP_IMAGE нужен только для интерполяции compose; app сейчас НЕ пересоздаётся.
source /opt/stockflow-ci/target.env
APP_ID=$(docker compose --project-directory "$DEPLOY_DIR" --env-file "$DEPLOY_DIR/.env" -p "$PROJECT" -f "$DEPLOY_DIR/compose.yaml" ps -q app)
export APP_IMAGE=$(docker inspect "$APP_ID" --format '{{.Config.Image}}')
CONFIRM_MANUAL_STAGE=stage bash scripts/db/manual-stage.sh
```

Это РУЧНОЙ запуск SQL-миграции оператором; CI пока её не применяет. Drizzle сохранит
правильную hash-историю. Не выполнять SQL второй раз через psql и не вставлять
фиктивные строки в журнал Drizzle. Скрипт сначала сверяет том, блокирует параллельную
доставку, делает и проверяет backup, сохраняет before и after схемы, запускает мигратор.
Результат: новый nullable столбец, старый app продолжает работать. Снимок: ручная
команда, новый столбец, файлы backup, успешное восстановление в проверочную БД.

Проверка на STAGE, из исходного каталога ЛР3:

```bash
cd ~/stockflow
docker compose exec -T db psql -U stockflow -d stockflow -c "SELECT column_name,data_type,is_nullable FROM information_schema.columns WHERE table_name='receipts' ORDER BY ordinal_position;"
docker compose exec -T db psql -U stockflow -d stockflow -c "SELECT m.code,coalesce(sum(r.quantity),0) balance FROM materials m LEFT JOIN receipts r ON r.material_id=m.id WHERE m.code='LAB3-STAGE-001' GROUP BY m.id;"
```

Ожидается unit_price_kopecks и прежние7 шт. Номер накладной ещё НЕ должен появиться.
Сравните after-manual/schema.sql и migrations.txt с артефактами TEST с помощью cmp.
Сейчас можно merge одобренного PR feature/lab8-price → dev. Stage в manual mode
ТОЛЬКО сравнит схему, не будет автоматически мигрировать. Дождаться успешной цепочки.
В браузере добавить отдельное учебное поступление с ценой и проверить стоимость.
Старые записи показывают «Не указана». Сделать скриншоты DEV build и интерфейса.

## Фаза II новая миграция и автоматизация

Только после фиксации результата первой фазы на STAGE: в target.env заменить
`MIGRATION_MODE=manual` на `MIGRATION_MODE=auto`. На TEST работают отдельные CI-базы,
текущую stockflow ЛР3 мигрировать заранее не требуется.

Windows:

```powershell
Set-Location D:\StockFlow
git switch -c feature/lab8-document origin/dev
git merge feature/labs4-8-preparation
git push -u origin feature/lab8-document
```

Проверить diff: новая0002 и автоматизация, нет изменения0000/применённой0001.
Переключить Settings root на feature/labs4-8-preparation. Успешный Verify и Acceptance feature,
реальный review, merge DEV. Публикация runner+migrator по тому же SHA.
Stage перед обновлением app выполняет:

1. Экспорт before, сверку истории с TEST (префикс hash).
2. Полный backup, pg_restore --list, восстановление и сравнение данных.
3. Восстановление этого же backup в stockflow_rehearsal_PID.
4. Миграцию копии immutable migrator и сравнение с эталоном TEST.
5. Миграцию настоящей STAGE, повторную сверку схемы и истории.
6. Обновление app, readiness; экспорт реально полученной STAGE-схемы.

Плохая/посторонняя схема не будет «исправлена» удалением таблиц: репетиция не совпадёт,
пайплайн остановится. При ошибке настоящей миграции app не обновляется. Аддитивные
миграции совместимы со старым app, поэтому rollback приложения не требует DROP COLUMN.
На малом диске заранее `df -h /` и `docker system df`. Не запускать prune с volumes.

На STAGE повторить SELECT information_schema: теперь есть document_reference.
В интерфейсе записать номер накладной в новом поступлении, обновить страницу.
Проверить LAB3-STAGE запись прежней командой (код именно LAB3-STAGE-001).
Скриншоты: before!=TEST, успешная rehearsal, after==TEST, новый номер накладной,
зелёный Stage и backup. Дамп хранится в /opt/stockflow-ci/backups, не в GitHub.

## Фаза III сознательная доставка PROD

Подготовить PROD target.env по ЛР5, TARGET=prod, MIGRATION_MODE=auto; сверить
DEPLOY_DIR/PROJECT/EXPECTED_DB_VOLUME на PROD, не копировать значения STAGE вслепую.
На TEST добавить PROD public SSH key через ssh-copy-id, сверить fingerprint по консоли,
добавить known_hosts. Это действие выполняется только перед этой фазой.

Перед Run: убедиться в успешной конкретной STAGE-сборке, её digest и backup. По методичке
PROD приводится к проверенной STAGE-схеме. На Windows перевести prod строго к её SHA:

```powershell
git fetch origin
git switch prod
git merge --ff-only origin/dev
git push origin prod
```

Если prod нельзя fast-forward, остановиться и согласовать историю через обычный PR;
не force/reset. Конкретный SHA должен быть тем же, который прошёл Stage. В TeamCity
открыть успешный Stage build → Promote → `04 Promote verified STAGE to PROD MANUAL`.
Убедиться, что выбрана нужная build chain. У конфигурации НЕТ автоматического триггера.
Verify prod и публикация prod отдельно демонстрируют ветку PROD; доставка использует
уже испытанный STAGE app digest, а не подменяет его заново собранным prod image.

На PROD (после успешного ручного Run):

```bash
cd ~/stockflow
docker compose ps
docker compose exec -T db psql -U stockflow -d stockflow -c "SELECT m.code,coalesce(sum(r.quantity),0) balance FROM materials m LEFT JOIN receipts r ON r.material_id=m.id WHERE m.code='LAB3-PROD-001' GROUP BY m.id;"
ls -lh /opt/stockflow-ci/backups
cat /opt/stockflow-ci/state/current.env
```

Ожидается прежняя запись и8 шт., новый app digest равен STAGE, схема/история равны
STAGE, .dump с checksum и restore-check. Снять реальные скриншоты цепочки и проверки.
Базу TEST/STAGE/PROD нельзя считать обновлённой до выполнения этих действий.

## Восстановление

После ошибки readiness автоматический rollback app. Для ручного возврата образа
из checkout соответствующего release на целевом стенде:

```bash
bash scripts/ops/rollback-app.sh
```

Если проблема именно в данных, сначала восстановить backup в НОВУЮ БД. На нужном
стенде в DEPLOY_DIR (заменить путь backup реальным, предварительно sha256sum -c):

```bash
sha256sum -c /opt/stockflow-ci/backups/ИМЯ.dump.sha256
docker compose exec -T db createdb -U stockflow stockflow_recovery
docker compose exec -T db pg_restore -U stockflow -d stockflow_recovery --exit-on-error --no-owner --no-privileges < /opt/stockflow-ci/backups/ИМЯ.dump
docker compose exec -T db psql -U stockflow -d stockflow_recovery -c 'SELECT count(*) FROM materials; SELECT count(*) FROM receipts;'
```

Если stockflow_recovery существует, createdb остановится: выбрать НОВОЕ имя,
не удалять существующую БД. Проверить строки, схему и совместимость образа.
Только после осознанного решения можно переключить app на восстановленную копию:
использовать compose.release.yaml + compose.recovery.yaml, переменную
STOCKFLOW_RECOVERY_DB=stockflow_recovery, прежние APP_IMAGE/MIGRATOR_IMAGE, тот же
-p и --project-directory; `up -d --no-deps app`. Не запускать migrate автоматически.
Оригинальная stockflow останется целой. После переключения остановить автоматические
доставки: target.env и эталон БД нужно согласовать отдельно. Это план аварийного
восстановления, а не автоматическое удаление новых операций.

## Ошибки и вопросы

hash mismatch — применённые SQL были изменены/не та ветка; не исправлять журнал SQL.
lock timeout — закончить конкурирующую операцию и повторить в окне обслуживания.
cmp differs — читать diff before/rehearsal/reference, не игнорировать проверку.
Недостаточно места — освободить только известные старые build images/свои временные
копии после проверки, сохранить актуальные backup и рабочие volumes.

Защита 5–7 минут: 1 минута инструменты и схема; 2 ручная фаза0001; 2 новая0002,
репетиция и автоматизация; 1–2 PROD backup/restore и совпадение digest/схем.
Вопросы: schema dump vs migration; зачем NULL; почему целые копейки; что хранит
Drizzle journal; почему одного размера .dump мало; почему нельзя DROP COLUMN для rollback;
почему сравнение before может показывать разницу, а after обязано совпасть.

## Инфраструктурная проверка перед защитой

Server/build-agent — отдельный Linux CI; Acceptance и доставка — TEST-agent.
При MIGRATION_MODE=manual автоматического применения0001 нет; только ручной
manual-stage.sh после успешного TEST и до merge DEV. Во второй фазе0002 auto.
Ни на STAGE, ни на PROD не запускается docker build; мигратор загружен готовым.
Домашний сервер без подтверждённого маршрута не является уже работающим CI.
Для screenshots указывать Agent и SHA отдельно у Verify, Acceptance, Publish, Stage.
