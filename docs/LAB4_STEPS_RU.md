# Лабораторная работа 4 Непрерывная интеграция на Linux

## Цель и требования

Методичка: push образа ЛР3 в Docker Hub, TeamCity Server, администратор и реальные
участники, GitHub, Docker build веток и push DEV/PROD. Конфигурация не заменяет
реальные запуски. Контрольная ветка codex/lab4-ready, без будущих миграций.
Windows используется для Git/SSH/браузера; Docker Desktop не требуется.

## 1 Подготовить Linux CI

Выполнить [LINUX_CI_SETUP_RU.md](LINUX_CI_SETUP_RU.md): новая CI VM8ГБ/4CPU/60ГБ,
NAT+Host-Only, предложенный IP192.168.56.14 сначала проверить. VM ещё не создана.
В документе есть установка Docker, resource gates, Server и build-agent, проверка
сети и вариант домашнего сервера. Существующие VM4ГБ для тяжёлого build не использовать.
Скриншот: ресурсы CI и Engine/Compose. На защите: «Выделен отдельный Linux-контур CI».

## 2 Ручная публикация исходного образа ЛР3

CI Linux по SSH, после настройки builder из предыдущего документа. Отдельный clone,
не ~/stockflow на TEST/STAGE/PROD. Следующие команды запускаются в одном bash:

```bash
set -Eeuo pipefail
cd ~/stockflow-ci-config
bash scripts/ci/preflight.sh build
git clone https://github.com/VladislavG32/stockflow.git ~/stockflow-lab3-image
cd ~/stockflow-lab3-image
git switch --detach 4d7097d226402ac5fc3e69de1bd054d0b1bf7494
test "$(git rev-parse HEAD)" = 4d7097d226402ac5fc3e69de1bd054d0b1bf7494
git status --short
read -rp 'Docker Hub username: ' HUB_USER
[[ "$HUB_USER" =~ ^[a-z0-9_-]+$ ]]
export DOCKER_CONFIG=$(mktemp -d)
trap 'rm -rf -- "$DOCKER_CONFIG"' EXIT
sudo env BUILDX_CONFIG=/opt/stockflow-ci/buildx docker buildx build --builder stockflow-builder --load --target runner -t "$HUB_USER/stockflow:lab3-4d7097d" .
docker login --username "$HUB_USER"
docker push "$HUB_USER/stockflow:lab3-4d7097d"
docker pull "$HUB_USER/stockflow:lab3-4d7097d"
docker image inspect "$HUB_USER/stockflow:lab3-4d7097d" --format '{{json .RepoDigests}}'
docker logout
```

Создать бесплатный публичный Docker Hub repository stockflow и Read/Write Access Token.
Токен вводится только в password prompt login, не в историю shell. Не выводить config.json.
Builder сохраняет локальный образ через --load; это ограниченный Docker build Linux.
Команды не запускают приложение, БД, Compose и миграции ЛР3. Если clone уже существует,
остановиться и проверить его путь/чистоту, не удалять и не reset автоматически.
Ожидается digest после pull; проверить тот же тег/digest в Hub. Скриншот: commit,
успешный push, Hub Tags, без токена. На защите: «Это исходный образ проверенной ЛР3».

Администратор и сервер на CI Linux уже созданы по LINUX_CI_SETUP_RU. Для индивидуального
проекта один реальный студент; две свои учётки не означают независимого согласования.

## 3 Подключить GitHub и настройки

Сначала прочитать раздел контрольных веток IMPLEMENTATION_STATUS_RU.md.
После просмотра файлов опубликуйте подготовленные ветки без force:

```powershell
Set-Location D:\StockFlow
git push -u origin codex/lab4-ready
git push origin codex/lab5-ready codex/lab6-ready codex/lab7-ready codex/lab8-manual-ready
# dev/prod уже могут существовать. Сначала проверить remote и прочитать BRANCH_UPDATE_RU.md.
git log --oneline --all -8
```

Если dev/prod ещё нет: `git branch dev codex/lab4-ready`, затем аналогично prod и
`git push origin dev prod`. Существующие ветки обновлять только обычным PR/merge.
Не переносить итоговую feature/labs4-8-preparation в DEV при выполнении ЛР4.

В TeamCity создать проект From repository URL `https://github.com/VladislavG32/stockflow.git`.
Если доступно обнаружение Kotlin DSL — выбрать `.teamcity/settings.kts`. Иначе создать
пустой проект, VCS root Settings на `refs/heads/codex/lab4-ready`, включить Versioned
Settings → Kotlin → использовать существующие настройки из VCS (не перезаписать
репозиторий сгенерированными пустыми настройками). Settings root без feature branchSpec.
В build settings выбрать Always use current settings; не загружать настройки из
ветки конкретной сборки. Названия пунктов могут отличаться в minor-релизе.

Build Source из DSL: URL GitHub, default refs/heads/dev, branchSpec `+:refs/heads/(*)`.
Для чтения публичного repo credentials Anonymous. Checkout mode On agent и clean
checkout включить для всех конфигураций. Test connection должен пройти.
Для ЛР4 нужен stockflow-build-agent на CI Linux из LINUX_CI_SETUP_RU.md.
TEST-agent требуется начиная с доставки ЛР5; никаких тяжёлых сборок на TEST.

В `02 Publish DEV PROD` заменить env.IMAGE_REPO на `<ваш_login>/stockflow`.
Добавить ТОЛЬКО здесь env.DOCKERHUB_USER и env.DOCKERHUB_TOKEN, тип Password,
не хранить actual value в Kotlin/Git. Не задавать их на уровне родительского проекта.
Если UI read-only из-за Versioned Settings: временно выключить синхронизацию настроек,
создать Password-параметры в Publish, открыть View as code и скопировать ТОЛЬКО ссылки
`credentialsJSON:...` в params Publish в settings.kts, например
`password("env.DOCKERHUB_TOKEN", "credentialsJSON:идентификатор_из_вашего_сервера")`.
Парольное значение не копировать. Commit с непрозрачными credential references,
затем снова включить чтение настроек из VCS. Эти references работают только с
сохранённым server_data вашего TeamCity; на новом сервере создать credentials заново.
У Verify не должно быть Docker Hub credentials. Скриншот: VCS root, branchSpec,
шаги и параметры с маскированными значениями.

## 4 Реальные проверки

В `01 Verify all branches` запустить dev, prod и feature-ветку от lab4-ready:

```powershell
git branch feature/lab4-ci codex/lab4-ready
git push -u origin feature/lab4-ci
```

Успех означает зелёные шаги lint/typecheck/unit/build и docker build. Для dev/prod
следом должен выполниться Publish и появиться тег `<ветка>-<полный SHA>`; для feature
публикации быть не должно. Проверить лог, SHA checkout и digest в release.env.
Скриншоты делать после реального завершения каждой ветки, затем Tags Docker Hub.
Убедиться, что Verify/Publish выбрали stockflow-build-agent на CI. Архив
ci-images.tar.gz и checksum — реальные артефакты. Publish только тегирует эти же
образы и отправляет их в Hub, не собирает заново. Схема данных ЛР4 остаётся0000.


## Ошибки и защита на 5–7 минут

Нет docker connection → проверить `systemctl status docker` НА CI Linux и права
пользователя, не устанавливать Docker на Windows. Нет совместимого агента → имя
stockflow-build-agent и его Authorize. Нет8111 → проверить private bind/address и curl
из build-agent. OOM/preflight → освободить ресурсы отдельной CI, не трогать рабочую БД.
401 Hub → username/token scope/repository. Повреждённый tar → повторить Verify.
Если команды требуют неизвестный адрес/аккаунт, это остающееся внешнее действие.

1мин: исходный commit и ручной push. 1мин: CI Linux и ресурсный бюджет. 2мин: Server,
build-agent, VCS/ветки. 1–2мин: реальные Verify/Publish, digest. На вопросы объяснить:
Server планирует, агент исполняет; tag отличается от digest; Windows не нужен для
контейнеров; TEST4ГБ не компилирует Next.js; feature не публикуется в Hub.
