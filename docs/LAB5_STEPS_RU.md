# Лабораторная работа 5 Непрерывная доставка

## Цель и требования

Методичка требует jetbrains/teamcity-agent на TEST, доставку из Docker Hub на STAGE
вместе с сохранённой PostgreSQL, функциональное изменение через feature → PR →
реальное одобрение другого человека → DEV → успешная доставка. Самоодобрение не подходит.
Подготовлены compose.agent, SSH-скрипты, release override и фильтр «Нулевой остаток».
Контрольная ветка `codex/lab5-ready`; схема всё ещё ЛР3.

## 1 Агент и защищённый канал

На TEST (SSH, замените ubuntu своим пользователем):

```bash
free -h
df -h /
sudo install -d -m 700 -o "$USER" -g "$(id -gn)" /opt/stockflow-ci/ssh
sudo mkdir -p /opt/buildagent/{work,temp,system,tools,plugins}
git clone -b codex/lab5-ready https://github.com/VladislavG32/stockflow.git ~/stockflow-ci-config
cd ~/stockflow-ci-config
docker compose -f infra/teamcity/compose.agent.yaml pull
docker compose -f infra/teamcity/compose.agent.yaml up -d
docker compose -f infra/teamcity/compose.agent.yaml logs --tail 60 agent
```

Если ~/stockflow-ci-config уже создан в ЛР4, пропустите clone и выполните команды
из этого каталога. Рабочий исходник ~/stockflow не переключать.

Windows PowerShell, отдельное окно держать открытым весь сеанс CI:

```powershell
ssh -N -o ExitOnForwardFailure=yes -o ServerAliveInterval=30 -R 127.0.0.1:18111:127.0.0.1:8111 ubuntu@192.168.56.11
```

Этот обратный туннель переносит порт Windows localhost:8111 на TEST localhost:18111.
В агенте Linux network_mode:host, SERVER_URL http://127.0.0.1:18111. Открывать Windows
firewall 8111 для всей сети не требуется. На TEST: `curl -I http://127.0.0.1:18111`.
В TeamCity Agents → Unauthorized проверить имя, затем Authorize. Не придумывать
токен агента: сервер сам сохранит авторизацию в agent_conf. Для восстановления
туннеля повторить SSH-команду; не удалять том агента.
Скриншот: connected/authorized agent, его имя, docker stats.

## 2 Подготовить STAGE без смены БД

На STAGE сначала в каталоге работающей ЛР3:

```bash
cd ~/stockflow
pwd
docker compose ls
docker compose ps
DB_ID=$(docker compose ps -q db)
docker inspect "$DB_ID" --format '{{range .Mounts}}{{println .Name .Destination}}{{end}}'
```

Записать абсолютный каталог, фактическое имя проекта из `compose ls` и имя тома
для /var/lib/postgresql/data. Не угадывать их по инструкции.
Создать `/opt/stockflow-ci/target.env` (на STAGE) с фактическими значениями:

```bash
sudo install -d -m 700 -o "$USER" -g "$(id -gn)" /opt/stockflow-ci
mkdir -p /opt/stockflow-ci/{releases,state,backups}
nano /opt/stockflow-ci/target.env
chmod 600 /opt/stockflow-ci/target.env
```

Пример содержимого, пути/том ЗАМЕНИТЬ результатами предыдущих команд:

```bash
TARGET=stage
DEPLOY_DIR=/home/ubuntu/stockflow
PROJECT=stockflow
EXPECTED_DB_VOLUME=stockflow_postgres_data
```

Для этапа ЛР5 MIGRATION_MODE ещё не нужен. В ЛР8 добавляется manual, позже auto.
SSH-пользователь должен иметь доступ к Docker и этому каталогу; это административные
права только в домашнем учебном контуре. `.env` с паролем остаётся в DEPLOY_DIR.
STAGE должен иметь исходную рабочую БД ЛР3 и применённую 0000; автоматической очистки нет.

На TEST создать отдельный ключ без вывода приватной части:

```bash
ssh-keygen -t ed25519 -f /opt/stockflow-ci/ssh/id_ed25519 -N '' -C stockflow-teamcity
ssh-copy-id -i /opt/stockflow-ci/ssh/id_ed25519.pub ubuntu@192.168.56.12
cp infra/teamcity/ssh_config.example /opt/stockflow-ci/ssh/config
nano /opt/stockflow-ci/ssh/config
ssh-keyscan -t ed25519 192.168.56.12 > /opt/stockflow-ci/ssh/known_hosts.candidate
ssh-keygen -lf /opt/stockflow-ci/ssh/known_hosts.candidate
```

На STAGE через консоль VirtualBox: `sudo ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub`.
Только после совпадения fingerprint на TEST:

```bash
mv /opt/stockflow-ci/ssh/known_hosts.candidate /opt/stockflow-ci/ssh/known_hosts
chmod 600 /opt/stockflow-ci/ssh/{config,id_ed25519,known_hosts}
docker compose -f infra/teamcity/compose.agent.yaml exec -T agent ssh -o BatchMode=yes stockflow-stage hostname
```

Результат stockflow-stage. Не добавлять PROD ключ/доступ раньше ЛР8. Не копировать
private key в Git, TeamCity artifacts или скриншот.

## 3 Feature и реальный Pull Request

Windows PowerShell, dev ещё на результате ЛР4:

```powershell
Set-Location D:\StockFlow
git fetch origin
git switch -c feature/lab5-zero-stock origin/dev
git merge --ff-only codex/lab5-ready
git push -u origin feature/lab5-zero-stock
```

Если dev уже содержит другие изменения, ff-only остановится. Создайте обычный merge
и разрешите конфликты, не reset/force. Предварительно сравните diff: новая функция
должна быть видна именно в PR. Не сливайте в dev финальную ветку ЛР8.

В GitHub создать PR feature/lab5-zero-stock → dev. Пригласить реального человека
с правом review. В Settings → Branch protection/rulesets для dev включить Require PR,
Require approvals 1, запрет force pushes. Для личного публичного repo проверьте
доступность правила в бесплатном тарифе. Самостоятельно создать Approved от второго
своего аккаунта не является независимым согласованием. Если участника нет, согласуйте
с преподавателем допустимый порядок — это остающееся внешнее действие.

В TeamCity сначала сохранить зелёный Verify feature. После реального approve выполнить
merge PR. Настройки TeamCity переключить на codex/lab5-ready: появится Stage.
Ветка build source остаётся dev. Дождаться Verify → Publish → Stage.

## 4 Проверка доставки и данных

STAGE:

```bash
cd ~/stockflow
docker compose ps
docker compose exec -T db psql -U stockflow -d stockflow -c "SELECT m.code,coalesce(sum(r.quantity),0) balance FROM materials m LEFT JOIN receipts r ON r.material_id=m.id WHERE m.code='LAB3-STAGE-001' GROUP BY m.id;"
curl --fail http://127.0.0.1:3000/api/ready
cat /opt/stockflow-ci/state/current.env
```

APP_PORT взять из вашей .env, если отличается. Ожидается прежняя запись и 7 шт.
В браузере STAGE выбрать «Нулевой остаток»: остаются только позиции с 0, включая
позиции с minimum=0. Поле в БД для этой функции не добавлялось. Readiness — HTTP 200.
Сравнить app digest в current.env и release.env TeamCity. Скриншоты: feature build,
реальное Approved, merge PR, DEV build, STAGE deploy, фильтр и сохранённая запись.

## Восстановление и ошибки

Автоматический rollback возвращает прежний app image при readiness failure. Он
не выполняет down и не удаляет том. Если откат сам не удался — `docker compose logs
--tail 100 app` и проверить свободный диск; не удалять PostgreSQL ради запуска.
После успешной доставки последующий ручной rollback доступен в финальных scripts/ops;
при ранней ЛР5 сохраните прежний image ID (`docker inspect <app-id> --format '{{.Image}}'`)
и запустите compose release с APP_IMAGE прежнего образа и `up -d --no-deps app`.
SSH host key changed — сверить ключ по VirtualBox, не отключать проверку.
Неверный том — исправить target.env после inspect, а не создавать новый том.
Permission denied — проверить ssh config User, authorized_keys и chmod.

## Вопросы и защита на 5–7 минут

1 минута — отличие CI от доставки. 1 — агент TEST и SSH-туннель.
2 — feature diff, реальный PR и approval. 1–2 — DEV build, digest, Stage и фильтр.
1 — сохранность записи и механизм rollback. Вопросы: почему --no-deps;
почему PostgreSQL не хранится в образе; почему согласование нельзя имитировать;
как проверить, что выбран именно прежний volume.
