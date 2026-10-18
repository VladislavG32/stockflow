# StockFlow Карта проекта для самостоятельной защиты

## Что делает приложение

Материал описывает складскую позицию и пороги. Поставщик — партнёр. Поступление
связывает материал, поставщика, дату и положительное количество. Остаток — сумма
поступлений, отдельного редактируемого поля «остаток» нет. Если остаток строго меньше
минимума, закупка равна цели минус остаток. На минимуме закупка0. Списаний пока нет.
Пример: остаток8, минимум10, цель30 → купить22. Ещё5 → остаток13, закупка0.

ЛР5 добавляет фильтр нулевого остатка. ЛР8 добавляет необязательную цену за единицу
в копейках и стоимость поступления, затем номер накладной. Неизвестная историческая
цена отличается от нуля. Это индивидуальный учебный склад, без авторизации и без
заявления о готовности к коммерческой эксплуатации.

## Путь одного запроса

1. InventoryForms задаёт поля, RecordForm превращает FormData в JSON.
2. API route читает тело через readJson, проверяет источник/формат/размер.
3. createReceipt(input: unknown) применяет receiptSchema, затем INSERT Drizzle.
4. PostgreSQL проверяет уникальный номер, внешние ключи и CHECK.
5. API возвращает201. Форма запрашивает /api/dashboard заново.
6. getDashboard читает согласованный REPEATABLE READ снимок; SUM считает остаток,
   replenishment определяет закупку, receiptCost считает стоимость.
7. React обновляет все таблицы вместе. Ошибка обновления после успешной вставки
   не означает повторить операцию: форма сообщает, что запись уже сохранена.

## Ключевые файлы и функции

| Файл | Назначение и что объяснить |
|---|---|
| src/app/page.tsx | Серверная загрузка initialData; force-dynamic; при build БД не нужна |
| src/app/layout.tsx | Общая оболочка Next.js, язык ru и стили |
| src/components/dashboard.tsx | React состояние, refresh, поиск/категории/фильтр; клиент не получает DATABASE_URL |
| src/components/inventory-forms.tsx | Поля создания; цена в копейках, nullable optional |
| src/components/record-form.tsx | Отправка POST/PATCH, числовое преобразование, защита повторного клика, вывод ошибки |
| src/components/inventory-tables.tsx | Каталог/поставщики/поступления/остатки/закупки; money только форматирует показ |
| src/lib/types.ts | JSON-контракт Material/Supplier/Receipt/DashboardData, без кода БД в браузере |
| src/lib/validation.ts | Zod: trim, strict, диапазоны, минимум<=цель, реальная дата, nullable price |
| src/lib/inventory.ts | Чистые replenishment, csvCell, matchesStockFilter, receiptCost; unit без PostgreSQL |
| src/lib/api.ts | HttpError; readJson до16КБ; apiError скрывает SQL/пароль, разбирает Drizzle cause |
| src/lib/repository.ts | createMaterial/createSupplier/createReceipt, updateLimits, getDashboard |
| src/db/index.ts | getDb лениво создаёт pg.Pool, max5, timeout; globalThis предотвращает лишние пулы HMR |
| src/db/schema.ts | Таблицы, FK restrict, unique, CHECK, индексы; не выполняет миграцию само |
| src/app/api/materials/route.ts | POST создания материала |
| src/app/api/materials/[id]/route.ts | PATCH существующих порогов; неизвестный ID →404 |
| src/app/api/suppliers/route.ts | POST поставщика |
| src/app/api/receipts/route.ts | POST неизменяемой операции |
| src/app/api/dashboard/route.ts | GET согласованного снимка |
| src/app/api/replenishment/export/route.ts | CSV полного актуального плана; фильтр браузера не меняет выгрузку |
| src/app/api/health/route.ts | Liveness: процесс отвечает без БД |
| src/app/api/ready/route.ts | Readiness: БД и нужные столбцы доступны, иначе503 |
| drizzle/0000_rainy_iceman.sql | Историческая схема ЛР3, не переписана |
| drizzle/0001_receipt_price.sql | Ручной этап ЛР8: nullable цена и CHECK NOT VALID |
| database/post-migrate/validate-price.sql | Валидация CHECK после COMMIT добавления |
| drizzle/0002_receipt_document.sql | Новый автоматический этап: номер накладной |
| drizzle/meta | Snapshot схемы для генерации и журнал порядка миграций; не backup пользовательских строк |
| scripts/migrate.mjs | Hash-check истории, advisory lock, timeout, Drizzle, отдельная validate; ошибку не маскирует успехом |
| scripts/seed.ts | Только явный seed; доставка его не вызывает |
| Dockerfile | dependencies → test-tools/builder/migrator/runner; production runner работает как node |
| compose.yaml | Сохранённый запуск ЛР3, постоянный postgres_data |
| compose.release.yaml | Образы по digest; app без автоматической миграции; прежний проект/volume |
| compose.ci.yaml | Одноразовая stockflow_ci, tmpfs, internal network, без published DB ports |
| compose.recovery.yaml | Только ручное переключение app на заранее восстановленную новую БД |
| infra/teamcity | Server/build-agent на CI Linux, TEST-agent для приёмки/SSH; private env вне Git |
| .teamcity/settings.kts | Verify(CI)→Acceptance(TEST)→Publish(CI)→Stage/Prod(TEST), sameChain, ветки и fail gates; Prod без trigger |
| .teamcity/pom.xml | Реальная генерация TeamCity XML, JDK21+, server plugin repository |
| scripts/ci/verify.sh | Последовательность проверок всех веток, первый failure останавливает всё |
| scripts/ci/static.sh | Gitleaks Git history, redact, JSON |
| scripts/ci/sql.sh | Squawk плюс локальная policy, отчёт и ненулевой exit |
| scripts/ci/integration.sh | Цикл отдельной PostgreSQL, HTTP-тесты, persistence, отказ БД, cleanup |
| scripts/ci/publish.sh | Только dev/prod, load того же bundle без rebuild, password-stdin и digests |
| scripts/ci/deliver.sh | Валидирует release.env без source; SSH/scp release, PROD SHA gate |
| scripts/ops/common.sh | Проверяет действующий db и точный volume из локального target.env |
| scripts/ops/deploy.sh | flock, pull, ручная/auto миграция, app-only update, readiness, rollback |
| scripts/ops/wait-ready.sh | Ограниченное ожидание HTTP200 с таймаутом запроса |
| scripts/ops/rollback-app.sh | Ручное возвращение предыдущего образа; не удаляет столбцы/данные |
| scripts/db/export.sh | pg_dump schema-only, нормализация служебных строк, журнал hash |
| scripts/db/backup.sh | pg_dump -Fc, list, восстановление в копию, сравнение содержимого |
| scripts/db/prepare-migration.sh | before → backup → rehearsal → cmp → real migration → cmp |
| scripts/db/sql-policy.mjs | Узкие запреты DROP/TRUNCATE/DELETE; не полноценный security parser |
| scripts/db/prepare-sql.mjs | Контекст таймаутов для анализа; не меняет историческую0000 |
| database/schema | Реальный штатный экспорт, нормализованный DDL, hashes/checksums; не пользовательские данные |
| tests | Unit бизнес-правил и API validation; детали в LAB7 |
| scripts/integration.ts | Настоящие HTTP/PG assertions; guard stockflow_ci и cleanup своих UUID |
| scripts/test-migrations.mjs | Новая БД, переходы версий, сохранность, CHECK, повтор, rollback ошибки |
| scripts/demo | Синтетическая secret-метка и ошибка бизнес-кода во временной копии |

## Почему запросы устроены так

LEFT JOIN в getDashboard сохраняет материалы без поступлений: иначе пустой материал
исчез бы, хотя именно он часто требует закупки. coalesce(sum(...),0) превращает
отсутствие операций в нулевой остаток. GROUP BY material.id даёт одну строку на позицию.
PostgreSQL возвращает SUM integer как bigint/string; Number безопасен в учебных
объёмах, а приложение ограничивает отдельную операцию миллионом единиц. Для огромного
склада потребовался бы отдельный анализ пределов суммарного числа операций.

REPEATABLE READ даёт всем запросам снимка одну версию данных: список поступлений
и остатки не расходятся, если другой пользователь в этот момент сделал вставку.
INSERT поступления атомарен, остаток не изменяется отдельным UPDATE: отсутствует
гонка «прочитал8, записал10» двух параллельных запросов. Unique number даёт409 при
повторной регистрации. Это защита от дубля номера, а не универсальная distributed
idempotency для любых разных номеров.

Индексы material_id/supplier_id ускоряют соединения, FK restrict защищает историю.
Параметризованный Drizzle/pg не вставляет значения пользователя в SQL-строку.
Команды backup перечисляют только фиксированные имена таблиц; временное имя БД
генерируется из PID, а не из пользовательского ввода.

## Короткие ответы

- CI: проверяем код до публикации. CD: доставляем уже проверенный artifact.
- Git branch хранит историю кода; Docker tag может перемещаться, digest задаёт содержимое.
- Volume хранит PostgreSQL независимо от контейнера; rebuild приложения его не удаляет.
- Migration меняет схему и фиксируется в журнале; schema dump показывает результат.
- Backup содержит строки и восстанавливается; schema-only не восстановит складские операции.
- Сначала ручная миграция нужна для демонстрации ЛР8, потом отдельная новая версия автоматизирует процесс.
- PROD нельзя обновить случайным feature build: нет trigger, нужен успешный Stage и matching prod SHA.
- 40% требований ТЗ нельзя заменить 98,17% покрытия импортированных unit-модулей.

Показывайте код в порядке «действие пользователя → API → validation → repository →
PostgreSQL → тест → CI». Тогда объяснение связано с задачей склада, а не с заученными терминами.

## Объяснение исправленной инфраструктуры

Windows — клиент управления. Отдельная новая CI Linux VM8ГБ собирает; TEST4ГБ
проверяет уже собранные образы и доставляет. HTTP8111 доступен в Host-Only/VPN,
SSH22 связывает TEST с целевыми стендами. Нет зависимости от Windows Docker.
preflight.sh запрещает запуск при недостатке RAM/диска. bundle/load-bundle переносят
образ по checksum и полному SHA; Acceptance получает настоящий PostgreSQL на TEST.
Процесс создания CI описан в LINUX_CI_SETUP_RU; VM/домашняя сеть ещё требуют настройки.
