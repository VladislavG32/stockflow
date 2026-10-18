# ЛР №3 «Контейнеризация»: пошаговое выполнение

Эта инструкция — план самостоятельной работы, а не утверждение о выполненных командах на VM. В ходе разработки нет подтверждённого SSH-доступа к TEST, STAGE и PROD. ЛР №1–2 и их отчёты не изменяются.

## 0. Подготовить ветку на рабочем компьютере

На Windows в PowerShell из `D:\StockFlow`:

```powershell
git switch feature/lab3-stockflow
git status
git log -3 --oneline
git push -u origin feature/lab3-stockflow
```

Первая команда выбирает новую ветку, status проверяет состояние, log показывает новые коммиты, push публикует эту ветку для клонирования на VM. Это обычный push без force; `main` не меняется. Если ветка ещё не опубликована, выполнить этот шаг до клонирования. Нужны ваши права GitHub. Не добавляйте токен в URL репозитория или скриншот.

Ожидается сообщение об upstream `origin/feature/lab3-stockflow`. Проверка:

```powershell
git ls-remote origin refs/heads/feature/lab3-stockflow
```

Скриншот №1: ветка, короткий лог и успешный push. На снимке не должно быть секретов.

## 1. Машины и адреса

Выполняйте шаги 2–11 сначала на TEST. После успешной проверки повторите на STAGE и затем PROD с той же версией кода. На каждой VM отдельные `.env` и volume. Здесь PROD — название учебной VM, а не готовность системы к публичному производственному использованию.

| VM | SSH с рабочего компьютера | Значение VM_IP внутри VM |
| --- | --- | --- |
| TEST | `ssh YOUR_USER@192.168.56.11` | `192.168.56.11` |
| STAGE | `ssh YOUR_USER@192.168.56.12` | `192.168.56.12` |
| PROD | `ssh YOUR_USER@192.168.56.13` | `192.168.56.13` |

Замените `YOUR_USER` своим логином. SSH уже настроен в ЛР №2. Адрес host-only нужен для доступа с Windows, NAT-адаптер — для apt, GitHub, npm и загрузки Docker-образов.

## 2. Проверить ОС, сеть и ресурсы

На каждой VM после входа:

```bash
hostname
cat /etc/os-release
ip -br address
free -h
df -h /
```

Команды показывают имя, ОС, адреса, память и место на диске. Ожидается Ubuntu Server 24.04.x LTS и нужный `192.168.56.*`. Для сборки удобно выделить VM не менее 4 ГБ RAM, 2 CPU и достаточно свободного диска (ориентир 10 ГБ). Если build убит OOM, увеличьте память VM, не отключайте TypeScript и lint.

Проверка успешности: адрес соответствует таблице, корневая файловая система не заполнена. Скриншот №2: ОС, hostname и IP. Реальную patch-версию Ubuntu укажите по выводу, даже если она отличается от запланированной.

## 3. Установить Docker Engine и Compose

На TEST; затем повторить на STAGE/PROD. Если Docker уже работает, сначала выполните команды версии в конце шага. При существующей установке не удаляйте её контейнеры и данные. Следующая установка предназначена для VM без Docker.

Команды соответствуют [официальной установке Docker для Ubuntu](https://docs.docker.com/engine/install/ubuntu/). Не нужен Docker Desktop внутри серверной VM.

```bash
sudo apt update
sudo apt install -y ca-certificates curl git openssl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
```

`apt` устанавливает инструменты, `install -d` создаёт каталог ключей, `curl` получает ключ официального репозитория.

```bash
sudo tee /etc/apt/sources.list.d/docker.sources > /dev/null <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "$VERSION_CODENAME")
Components: stable
Signed-By: /etc/apt/keyrings/docker.asc
EOF
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
```

Deb822-файл добавляет официальный репозиторий для codename вашей Ubuntu. Устанавливаются движок, CLI, containerd, сборщик и Compose v2; systemctl запускает службу и включает автозапуск. На конфликт пакетов отвечайте по официальной инструкции, не удаляя чужие данные.

Проверка:

```bash
sudo docker version
sudo docker compose version
sudo docker run --rm hello-world
```

Ожидаются разделы Client и Server, версия Compose и `Hello from Docker!`. Скриншот №3: версии и успешный hello-world. Здесь и далее используется sudo, поэтому добавление пользователя в группу docker не требуется.

## 4. Получить проект

На каждой VM:

```bash
git clone --branch feature/lab3-stockflow https://github.com/VladislavG32/stockflow.git
cd stockflow
git branch --show-current
git log -1 --oneline
```

Ожидается новая ветка и её последний коммит. Если каталог уже существует, сначала проверьте `git status`, затем `git fetch origin` и `git switch feature/lab3-stockflow`; при чистой рабочей директории можно обновить `git pull --ff-only`. Не делайте reset/force для устранения непонятной ситуации.

Для воспроизводимого этапа STAGE/PROD после fetch выберите тот же полный hash, который успешно проверен на TEST:

```bash
git switch --detach REPLACE_WITH_TEST_COMMIT_HASH
git rev-parse HEAD
```

Это обычный detached checkout; он не изменяет историю удалённой ветки. Сравните hash на трёх VM. Скриншот №4: адрес VM/hostname, ветка или checkout и commit.

## 5. Создать конфигурацию без раскрытия пароля

На TEST установите:

```bash
VM_IP=192.168.56.11
```

На STAGE вместо этого `VM_IP=192.168.56.12`, на PROD — `VM_IP=192.168.56.13`.

Только при первом запуске в каталоге проекта:

```bash
test ! -e .env && cp .env.example .env
if grep -q '^POSTGRES_PASSWORD=replace_with_random_hex$' .env; then
  DB_PASSWORD=$(openssl rand -hex 24)
  sed -i "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$DB_PASSWORD/" .env
  sed -i "s|^DATABASE_URL=.*|DATABASE_URL=postgresql://stockflow:$DB_PASSWORD@127.0.0.1:5432/stockflow|" .env
  unset DB_PASSWORD
fi
sed -i "s/^APP_BIND_ADDRESS=.*/APP_BIND_ADDRESS=$VM_IP/" .env
chmod 600 .env
git check-ignore .env
```

Создаётся `.env`, заполнитель заменяется случайным hex-паролем, порт app привязывается к host-only IP, файл читается только владельцем. Пароль не выводится на экран. `DATABASE_URL` используется npm-командами на хосте; Compose самостоятельно формирует адрес с `@db:5432`.

При повторной работе не генерируйте пароль заново: в существующем volume пароль роли уже установлен. Изменение только `.env` не меняет пароль в БД. Не выводите `.env` и полный `docker compose config` в отчёт. Безопасная проверка синтаксиса:

```bash
sudo docker compose config --quiet
```

Ожидается код 0 и отсутствие сообщений. Если `APP_PORT=3000` занят, измените его в `.env` и используйте новый порт в дальнейших URL.

Скриншот №5: `git check-ignore .env` и успешный `config --quiet`, без содержимого файла. При включённом UFW для проверки с Windows разрешите TCP 3000 только с адреса host-only интерфейса Windows (определите его через `ipconfig`); не открывайте порт БД и доступ из Интернета.

## 6. Собрать и запустить

На TEST, затем после проверки на остальных VM:

```bash
sudo docker compose up -d --build --wait
sudo docker compose ps -a
sudo docker compose logs --tail=40 migrate
```

Docker собирает стадии Dockerfile. Compose ждёт готовности PostgreSQL, применяет миграции и запускает приложение. На первом запуске загрузка образов и npm-зависимостей может занять несколько минут.

Ожидается: db и app работают и healthy, migrate завершился с кодом 0. `Exited (0)` у migrate — нормальный результат одноразового процесса, а не ошибка.

При ошибке:

```bash
sudo docker compose logs --tail=80 db app migrate
```

Проверьте причину; не отключайте healthcheck или проверки TypeScript. Скриншот №6: успешная сборка, ps и результат миграции.

## 7. Проверить приложение и базу

Внутри VM:

```bash
curl -fsS "http://$VM_IP:3000/api/health"
curl -fsS "http://$VM_IP:3000/api/ready"
sudo docker compose exec -T db psql -U stockflow -d stockflow -c '\dt'
```

Health вернёт `{"status":"ok","service":"stockflow"}`, ready — также `"database":"ok"`. В списке таблиц ожидаются materials, suppliers, receipts. Пароль psql внутри контейнера не требуется при стандартном local socket доступе образа PostgreSQL.

С Windows откройте соответствующий адрес:

- TEST: `http://192.168.56.11:3000`
- STAGE: `http://192.168.56.12:3000`
- PROD: `http://192.168.56.13:3000`

Сначала справочники пустые — это нормальный результат новой БД. Скриншот №7: ready, таблицы и главная страница с видимым адресом VM.

## 8. Проверить бизнес-сценарий

В браузере на TEST; повторить на STAGE/PROD при приёмке:

| Действие | Что ввести | Ожидаемый результат и снимок |
| --- | --- | --- |
| Новый поставщик | Название «Поставщик ЛР3», контакт «Учебный пример» | Партнёр появился в справочнике |
| Новый материал | Код `LAB3-001`, имя «Картридж для защиты», категория «Расходные материалы», ед. «шт.», минимум 10, цель 30 | Остаток 0, план рекомендует 30; скриншот №8 |
| Поступление | Номер `LAB3-PR-001`, выбранные материал/поставщик, количество 8, текущая дата | Остаток 8, рекомендация 22; скриншот №9 |
| Ещё поступление | Номер `LAB3-PR-002`, количество 22 | Остаток 30, предупреждение снято; скриншот №10 |
| Дубликат | Повторить `LAB3-PR-002` | Понятная ошибка, остаток остаётся 30 |
| Настройка порога | В каталоге «Пороги»: минимум 40, цель 60 | При остатке 30 рекомендация 30 |
| Поиск и фильтр | Найти `LAB3-001`, выбрать категорию, запас «Ниже минимума» | Осталась нужная позиция |
| Экспорт CSV | Нажать экспорт в плане | Скачать и открыть CSV; русский текст читается, закупка 30 |

Скриншот №11: работающий план и скачанный CSV. При повторной проверке используйте новые уникальные коды/номера либо проверяйте уже созданные записи. Не сбрасывайте БД ради повторного сценария.

## 9. Доказать сохранение данных

На TEST запомните количество записей и данные материала до остановки:

```bash
sudo docker compose exec -T db psql -U stockflow -d stockflow -c "SELECT m.code, COALESCE(SUM(r.quantity), 0) AS balance FROM materials m LEFT JOIN receipts r ON r.material_id = m.id WHERE m.code = 'LAB3-001' GROUP BY m.id;"
sudo docker volume ls --filter name=stockflow
sudo docker compose stop
sudo docker compose start --wait
```

Ожидается тот же остаток 30 в браузере после обновления. Это проверка остановки/старта. Затем более сильная проверка с пересозданием контейнеров:

```bash
sudo docker compose down
sudo docker compose up -d --wait
sudo docker compose ps -a
sudo docker compose exec -T db psql -U stockflow -d stockflow -c "SELECT m.code, COALESCE(SUM(r.quantity), 0) AS balance FROM materials m LEFT JOIN receipts r ON r.material_id = m.id WHERE m.code = 'LAB3-001' GROUP BY m.id;"
```

Volume не удаляется. Миграции повторно завершаются успешно, запись остаётся. Не используйте `down -v`, `volume rm` или очистку диска. Скриншоты №12–13: SQL-результат до и после, работающие контейнеры и сохранённая запись в интерфейсе. Повторите этот тест на остальных VM, если требуется их независимая приёмка.

## 10. Поведение при недоступности БД

На TEST после проверки сохранности:

```bash
sudo docker compose stop db
curl -i "http://$VM_IP:3000/api/ready"
curl -i "http://$VM_IP:3000/api/health"
sudo docker compose start db
```

Ready должен вернуть 503, health остаётся 200: процесс жив, но к работе с данными не готов. После старта БД подождите несколько секунд, снова запросите ready — ожидается 200. В браузере «Обновить данные» восстанавливает снимок. Скриншот №14: различие health и ready, затем восстановление. Docker сам по себе не перезапускает контейнер только из-за статуса unhealthy; `restart: unless-stopped` относится к завершению процесса.

## 11. Автоматические проверки и резервная копия

Для повторной проверки кода на Windows в каталоге проекта:

```powershell
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

`npm ci` воспроизводит зависимости по lock-файлу; lint проверяет код, typecheck — типы и маршруты, test — правила расчёта/валидации, build — production-сборку. Скриншот №15: успешные результаты и hash проверенного коммита. В VM Node.js отдельно не обязателен, поскольку сборка идёт внутри Docker.

`npm run test:integration` требует работающего приложения и `DATABASE_URL` к той же базе для очистки своих QA-записей. Для локальной разработки используйте README; не подставляйте адрес чужой или рабочей базы. Скрипт не очищает таблицы целиком.

На каждой VM можно сделать резервную копию перед следующими лабораторными:

```bash
mkdir -p "$HOME/stockflow-backups"
chmod 700 "$HOME/stockflow-backups"
umask 077
sudo docker compose exec -T db pg_dump -U stockflow -d stockflow > "$HOME/stockflow-backups/stockflow-$(date +%Y%m%d-%H%M%S).sql"
ls -lh "$HOME/stockflow-backups"
```

`pg_dump` создаёт SQL-снимок независимо от volume; файл хранится вне Git. Восстановление заменяет/добавляет данные и требует отдельного аккуратного плана, поэтому не выполняйте его поверх базы для демонстрации без необходимости.

## 12. Что включить в новый отчёт

Цель ЛР №3; схема «Ubuntu VM → Docker → app/migrate/db → volume»; исходный commit и новая ветка; состав Dockerfile и Compose; миграции; снимки шага 6–10; доказательство сохранности; вывод о различии виртуализации и контейнеризации. Отдельно указать, что настоящая БД, формы и план пополнения появились после ЛР №2.

Не выдавайте локальные проверки автора за собственный запуск на трёх VM. Не помещайте в отчёт `.env`, пароли, токены GitHub и полный вывод `docker inspect`, содержащий окружение. TeamCity, Docker Hub и CI/CD оставьте для будущих работ.
