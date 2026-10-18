# Статус после исправления Linux инфраструктуры

Архитектура прежней подготовки пересмотрена: Windows не запускает Docker/TeamCity.
Server/build-agent — отдельный Linux CI, Acceptance/доставка — TEST-agent.
CI VM ещё не создана, домашняя сеть не проверена, стенды не подключались.
См. INFRA_AUDIT_RU, LINUX_CI_SETUP_RU и NEXT_STEPS_RU.

Ниже сохранены результаты предыдущих локальных проверок приложения; они не являются
результатами нового Linux pipeline. Новый аудит конфигураций приведён ниже.

## Реально выполнено в дополнительном аудите

| Проверка | Результат |
|---|---|
| npm ci / ESLint / TypeScript / production build | Успех на локальном Windows, без Docker runtime |
| Unit итоговой версии |10 групп прошли |
| Новые инфраструктурные тесты |3 прошли: разделение ролей, отказ corrupt bundle, запрет feature push |
| Все5 ready-веток |Unit+infra+Bash syntax прошли; SQL-файлы остались по этапам |
| Kotlin DSL |JDK21/Maven: все5 ready и итоговая конфигурация — BUILD SUCCESS |
| XML graph |2/3/3/4/4/5 конфигураций, роли агентов, sameChain и отсутствие Prod trigger проверены |
| Compose |Server, build-agent, TEST-agent, CI и release/recovery — config успешен |
| Bash-инструкции / PowerShell-инструкции |27 Bash-блоков и PowerShell-блоки разобраны без синтаксических ошибок |
| Совместимость CLI |Проверен help Compose run/up; неподдерживаемый run --no-build удалён |
| PostgreSQL17.10 локально |HTTP integration и миграционные сценарии снова прошли, VM не использовались |
| Gitleaks / Squawk / SQL policy |0 секретов;0 замечаний в6 SQL-файлах; policy прошла |
| Git ancestry |Каждая старая ready-вершина — предок новой; dbae70f — предок итоговой |

Фактических Linux Docker build/run/TeamCity/Hub/SSH-deploy на VM не было. Размеры
RAM/диска — выбранные ограничения, а не измерения ваших VM. npm ci снова сообщил
9 известных проблем dev-зависимостей; force-обновления не применялись.

## Предыдущая локальная проверка приложения

Дата проверки: 18 октября 2026, локальный Windows-хост. Это статус подготовки,
не отчёт о сдаче ЛР и не журнал запусков TeamCity/VM.

## Сохранность

База истории — 4d7097d226402ac5fc3e69de1bd054d0b1bf7494. Ветка feature/lab3-stockflow,
коммиты ЛР1–3, compose.yaml и старые документы не переписаны. Рабочие базы трёх VM
не подключались, миграции/seed туда не запускались. Force push не выполнялся.
Новые изменения закоммичены в feature/labs4-8-preparation, внешней публикации пока нет.

## Контрольные версии для последовательной защиты

| ЛР | Рабочая контрольная ветка | Состав |
|---|---|---|
| 4 | codex/lab4-ready | ЛР3 + Verify/Publish, без будущей БД |
| 5 | codex/lab5-ready | + нулевой остаток, Agent, Stage, без изменения схемы |
| 6 | codex/lab6-ready | + Gitleaks и ESLint gates |
| 7 | codex/lab7-ready | + API unit, isolated PG, persistence/failure tests |
| 8 ручная | codex/lab8-manual-ready | + только0001, цена, backup, manual Stage |
| 8 auto/PROD | feature/labs4-8-preparation | +0002, накладная, rehearsal и manual Prod |

Ветки ready образуют последовательность для merge в dev. Они включают исправления
аудита; первоначальные теги prep-lab4/5/6/7/8-manual/8-auto сохранены как промежуточные
точки разработки. Для выполнения используйте ready-ветки, не промежуточные теги.
Полный реестр SHA фиксируется в docs/PREPARATION_REFS_RU.md; `git log --oneline`
показывает фактическую историю. Сданные работы не получают задним числом новый код.

## Что реально проверено

| Проверка | Результат |
|---|---|
| npm ci | Успех, lockfile сохранён; audit сообщает9 dev-проблем; production audit:0 |
| ESLint | Успех, без выключения правил |
| next typegen + TypeScript | Успех |
| node:test | 10 групп в итоговой версии, все прошли |
| Code coverage | 98,17% строк только api/inventory/validation, не всего проекта |
| Demo ошибка кода | Один и тот же тест упал на <= и прошёл после возврата < во временной копии |
| HTTP + реальная PostgreSQL17.10 | integration.ts прошёл, включая дубликаты/параллельность/цены |
| Недоступная БД | Отдельный app с недоступным адресом: health200, ready503, dashboard503 |
| Миграции |0000→0001→0002; исторические строки; CHECK; повтор; atomic rollback и отказ при изменении hash проверены |
| Сохранность при restart app | Маркер PERSIST-LOCAL сохранился после остановки и нового запуска standalone |
| Production Next build | Успех, standalone |
| Штатный schema export | pg_dump17.6 против PostgreSQL17.10, schema.raw.sql/schema.sql, hash history |
| Backup непустой БД | pg_dump custom → новая БД pg_restore; все строки трёх таблиц равны |
| Gitleaks8.30.1 | История проверена, находок нет; synthetic demo отдельно обнаруживается |
| Squawk2.70.0 |0 замечаний в6 SQL-файлах с документированным контекстом мигратора |
| Bash syntax | Все .sh проходят bash -n |
| Compose config | ci, release+base, server, agent, recovery проходят parse/config |
| Registry manifests | Теги TeamCity server/agent2026.2 и Squawk2.70.0 существуют, metadata проверены |
| TeamCity Kotlin DSL | Maven generate с JDK21 и официальным plugin repo успешно создал XML для итоговой и всех5 контрольных конфигураций |
| Docker build/run | НЕ выполнены: Linux Engine локально не используется; Docker build/run на VM ещё не выполнены |
| TeamCity build/server/agent | НЕ выполнялись; XML generation не равна реальной сборке |
| Docker Hub push | НЕ выполнялся, нужен пользовательский аккаунт/token |
| STAGE/PROD delivery | НЕ запускалась; SSH/rollback/rehearsal на VM предстоит проверить |
| 40% полного ТЗ | Не подтверждено: сданное индивидуальное ТЗ отсутствует в архиве |

Исходные локальные логи/инструменты находятся в artifacts (Git-ignored), без переноса
секретов. Для отчётов нужны новые реальные результаты на ваших стендах.

## Остаточные ограничения

- Docker pipeline и VM-скрипты написаны и прошли синтаксическую проверку, но требуют
  end-to-end прогона после запуска Engine/TeamCity. Не считать их проверенной эксплуатацией.
- Память TEST4ГБ ограничена. Только готовые контейнеры на TEST, тяжёлые сборки на CI; при OOM сборки
  перенести на выделенный Linux CI8ГБ/60ГБ. Домашний сервер допустим после проверки сети.
- npm audit нашёл4 moderate и5 high в dev-tool цепочках drizzle-kit и eslint-config-next.
  Предлагались несовместимые downgrade через --force, они не применялись. Обновление
  инструментов в отдельной fix-ветке и повторный audit остаются отдельной проверкой.
- Backup и rehearsal требуют несколько объёмов размера БД. До запуска проверить место.
- Нельзя гарантировать 40% полного ТЗ по одному описанию реализованных функций.
  Матрица в LAB7 содержит входы/ожидания, но номера/знаменатель надо сверить по сданному ТЗ.
- Реальное согласование PR другим человеком нельзя сделать технической конфигурацией.
- Нет E2E тестов браузера; поиск/фильтры в UI проверить вручную.

## Какие доступы нужны и что делать дальше

1. Доступ к выбранному Linux CI и SSH к TEST/STAGE/PROD, реальные имена SSH-пользователей.
2. Docker Hub username + write Access Token для Publish, публичный stockflow repository.
3. GitHub push/PR/rulesets, реальный reviewer для DEV; read-only clone публичный без PAT.
4. Администратор локального TeamCity, авторизация агента, защищённые параметры Publish.
5. Фактические DEPLOY_DIR/PROJECT/volume каждого стенда, сверка host key fingerprint.
6. Индивидуальное сданное ТЗ для окончательного расчёта функционального покрытия.

Проходить строго: ЛР4 Server/Hub/CI → ЛР5 Agent/PR/Stage → ЛР6 static gates →
ЛР7 unit+PG+ветки → ЛР8 ручная0001 → отдельная автоматическая0002 → conscious PROD.
Скриншоты делать после реального результата по LAB*_STEPS_RU, Word-отчёты оформлять позже.
