# StockFlow

Учебная система автоматизации складского учёта Московского Политеха по дисциплине «Автоматизация процессов жизненного цикла программных средств».

## Этапы проекта

- ЛР №2 «Виртуализация»: исходный прототип в commit `1fbdd2b67a434f1fb727c7c79e87f56c3ba1254f`, без БД и Docker.
- ЛР №3 «Контейнеризация»: новые функции в ветке `feature/lab3-stockflow`. История `main` и старые отчёты не изменяются.

Полный исходный текст ТЗ ЛР №1 не хранится в репозитории. Сохранены известные требования: русская главная страница, заголовок и подзаголовок, четыре раздела, отметка об учебном назначении и прежний JSON `/api/health`.

## Возможности

- Создание и просмотр материалов и поставщиков с сохранением в PostgreSQL.
- Регистрация поступлений с уникальными номерами, датой и примечанием.
- Остатки как сумма операций, без захардкоженных значений.
- Минимальный и целевой запас каждого материала; изменение порогов.
- «Умный план пополнения»: при остатке ниже минимума рекомендуется пополнение до цели.
- Обновление плана после поступления, предупреждения и экспорт полного плана в CSV.
- Поиск по разделам, фильтрация материалов по категории и состоянию запаса.
- Серверная валидация, понятные ошибки, состояния ожидания и пустых списков.

Количество задаётся в целых единицах. Списания, резервы, полноценные заказы, пользователи и роли пока не реализованы. Нет TeamCity, Docker Hub, CI/CD и платных API. Для этой учебной версии используйте loopback или host-only сеть VM.

## Стек

Next.js 16, React 19, TypeScript, npm, ESLint, App Router, PostgreSQL 17, Drizzle ORM, Zod. Обычный CSS без UI-фреймворка. Node.js 24 LTS рекомендуется; минимальная версия — 20.9. Точные npm-версии находятся в lock-файле.

## Быстрый запуск в Docker

Нужен работающий Docker Engine с Linux-контейнерами и Docker Compose. На Windows Docker Desktop требует настроенного WSL2/поддерживаемого backend. Установки одного CLI недостаточно.

1. Скопируйте `.env.example` в `.env` (`cp .env.example .env` на Ubuntu, `Copy-Item .env.example .env` в PowerShell).
2. Замените `replace_with_random_hex` в POSTGRES_PASSWORD и DATABASE_URL одним случайным hex-паролем. На Ubuntu его можно получить командой `openssl rand -hex 24`. Не публикуйте `.env`.
3. Запустите:

```bash
docker compose config --quiet
docker compose up -d --build --wait
docker compose ps -a
```

Откройте [http://localhost:3000](http://localhost:3000). Сначала каталог пустой. Создайте поставщика и материал через формы. Статус `Exited (0)` у сервиса migrate означает успешное завершение миграции. Движок сначала запускает БД, затем миграции и приложение. Для VM укажите APP_BIND_ADDRESS, соответствующий её host-only IP, по инструкции ниже.

Остановка и повторный запуск с сохранением данных:

```bash
docker compose down
docker compose up -d --wait
```

Не добавляйте `-v`: этот ключ удаляет volume PostgreSQL. Изменение POSTGRES_PASSWORD в `.env` не меняет пароль уже созданной роли в существующем volume.

## Локальная разработка (Next.js на хосте, БД в Docker)

Подготовьте `.env` как выше. DATABASE_URL должен указывать на PostgreSQL по `127.0.0.1:5432`, с тем же паролем.

```bash
docker compose -f compose.yaml -f compose.dev.yaml up -d db
npm ci
npm run db:migrate
npm run dev
```

`npm install` также поддерживается; `npm ci` рекомендуется для воспроизведения lock-файла. PostgreSQL можно запустить отдельно без Docker, создать БД и пользователя и указать свой DATABASE_URL. Переменные для npm-команд читаются из `.env`. Не используйте `.env.local` для CLI миграций/seed: dotenv по умолчанию читает `.env`, а Next.js мог бы подключиться к другой БД.

Необязательное заполнение вымышленными примерами ЛР №3 (в окружении разработки):

```bash
npm run db:seed
```

Seed не выполняется автоматически, не меняет существующие записи и допускает повторный запуск без удвоения поступлений. У каждой записи примера есть код DEMO. Учебные начальные остатки также создаются настоящими поступлениями. Не выдавайте эти данные за возможности ЛР №2.

## Проверки и production-запуск

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

`npm start` запускает standalone-сборку через `scripts/start.mjs`, который копирует статику рядом с server.js. Порт — APP_PORT из `.env` или 3000; возможен явный `npm start -- --port 3001 --hostname 127.0.0.1`. Docker напрямую запускает standalone server.js. Сборка не требует работающей БД или настоящего DATABASE_URL.

Перед повторной сборкой остановите локальный production-сервер (Ctrl+C). В Windows запущенный standalone-процесс удерживает каталог, который build должен пересоздать.

HTTP-интеграция с настоящим PostgreSQL (приложение должно уже работать):

```bash
npm run test:integration
```

По умолчанию BASE_URL — `http://127.0.0.1:3000`. При другом порте в PowerShell: `$env:BASE_URL='http://127.0.0.1:3001'`; в Ubuntu: `BASE_URL=http://127.0.0.1:3001 npm run test:integration`. DATABASE_URL должен относиться к той же базе, что и сервер. Проверка создаёт уникальные QA-записи, проверяет операции/ошибки и удаляет только свои записи. Это не тест удаления всех данных и не нагрузочный тест.

## API

| Метод и адрес | Назначение |
| --- | --- |
| GET `/api/health` | Старый контракт: `{"status":"ok","service":"stockflow"}` |
| GET `/api/ready` | Доступность PostgreSQL и трёх таблиц: HTTP 200 или 503 |
| GET `/api/dashboard` | Согласованный снимок справочников, журнала и расчётов |
| GET/POST `/api/materials` | Просмотр / создание материала |
| PATCH `/api/materials/:id` | Изменение minimumStock и targetStock |
| GET/POST `/api/suppliers` | Просмотр / создание поставщика |
| GET/POST `/api/receipts` | Просмотр / регистрация поступления |
| GET `/api/replenishment/export` | Полный свежий план в CSV UTF-8 |

Запись принимает application/json. Материал: code, name, category, unit, minimumStock, targetStock. Поставщик: name, необязательный contact. Поступление: number, materialId, supplierId, quantity, receivedOn (YYYY-MM-DD), необязательный note. Поля minimumStock/targetStock/quantity и ID — числа JSON, а не строки. Порог: `0 ≤ minimumStock ≤ targetStock ≤ 1 000 000`; количество: целое `1…1 000 000`.

## Миграции

Описание схемы: `src/db/schema.ts`, SQL и метаданные: `drizzle/`.

```bash
npm run db:generate
npm run db:migrate
```

Генерация нужна после изменения схемы, применение — при развёртывании. Уже применённые миграции не редактируйте. Compose выполняет migrate автоматически отдельным процессом до app.

## Документы и защита

- [DEFENSE_GUIDE_RU.md](docs/DEFENSE_GUIDE_RU.md): структура, реальные примеры кода, путь данных, алгоритм, Docker и вопросы преподавателя.
- [LAB3_STEPS_RU.md](docs/LAB3_STEPS_RU.md): команды для TEST `192.168.56.11`, STAGE `.12`, PROD `.13`, результаты и моменты для скриншотов.
- [VERIFICATION_RU.md](docs/VERIFICATION_RU.md): фактически выполненные проверки и ограничения среды.

Старую версию можно изучить без изменения текущей ветки, создав отдельный checkout из родительского каталога:

```bash
git worktree add --detach ../StockFlow-lab2 1fbdd2b67a434f1fb727c7c79e87f56c3ba1254f
```

В нём выполните `npm ci`, `npm run build`, затем `npm start -- --port 3002`. Для возвращения к разработке достаточно открыть исходный каталог StockFlow с веткой feature/lab3-stockflow. Не нужно reset, rebase или force push.

## Источники

[Next.js: deployment](https://nextjs.org/docs/app/getting-started/deploying), [Drizzle: миграции](https://orm.drizzle.team/docs/migrations), [Docker Compose: запуск зависимостей](https://docs.docker.com/compose/how-tos/startup-order/).
