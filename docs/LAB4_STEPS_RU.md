# Лабораторная работа 4 Непрерывная интеграция

## Цель и требования

По методичке: вручную push образа ЛР3 в Docker Hub; TeamCity Server; администратор;
пользователи реальной команды; GitHub VCS Root; Docker build всех веток и push
DEV/PROD; реальные результаты и скриншоты. Файлы конфигурации ещё не означают сдачу.

Подготовлены `.teamcity`, `infra/teamcity/compose.server.yaml`, verify/publish.
Для этой работы берите `codex/lab4-ready`: в ней НЕТ будущих миграций и цены.
Исходный коммит ЛР3 остаётся доступен. Не развёртывайте финальную ветку на VM сейчас.

## 1 Проверить ресурсы и опубликовать именно ЛР3

Windows PowerShell, Docker Desktop должен показывать работающий Linux Engine:

```powershell
Set-Location D:\StockFlow
Get-CimInstance Win32_OperatingSystem | Select-Object FreePhysicalMemory,TotalVisibleMemorySize
docker info
git worktree add D:\StockFlow-lab3-image 4d7097d226402ac5fc3e69de1bd054d0b1bf7494
Set-Location D:\StockFlow-lab3-image
$HubUser = Read-Host 'Docker Hub username'
docker login --username $HubUser
docker build --target runner -t "${HubUser}/stockflow:lab3-4d7097d" .
docker push "${HubUser}/stockflow:lab3-4d7097d"
docker pull "${HubUser}/stockflow:lab3-4d7097d"
docker image inspect "${HubUser}/stockflow:lab3-4d7097d" --format '{{json .RepoDigests}}'
```

Создайте бесплатный Docker Hub repository `stockflow` и Access Token с Read/Write.
Вводите токен в приглашение docker login; не пишите его в команды/отчёт.
Ожидается digest, совпадающий с Docker Hub. Скриншот: успешный push и страница Tags.
Это не затрагивает VM и не требует БД при build.

## 2 Запустить сервер на Windows

```powershell
Set-Location D:\StockFlow
docker pull jetbrains/teamcity-server:2026.2
docker compose -f infra/teamcity/compose.server.yaml config --quiet
docker compose -f infra/teamcity/compose.server.yaml up -d
docker compose -f infra/teamcity/compose.server.yaml logs --tail 60 server
docker stats --no-stream
```

Открыть http://127.0.0.1:8111. Пройти первоначальную настройку: каталог данных,
встроенная БД для небольшого учебного сервера, принять лицензию, выбрать бесплатный
режим, создать администратора с личным паролем. Встроенная БД TeamCity не является
PostgreSQL StockFlow. Не публиковать 8111 в Интернет. Если Windows-хосту не хватает
памяти, сначала освободить RAM; не переносить вслепую server+build на TEST.
Скриншот: главная страница после входа, версия, docker stats. Пароли скрыть.

В Administration → Users создать учётную запись для себя; отдельный обычный
пользователь допустим для демонстрации ролей. Не выдавать две свои учётки за двух
членов команды. Для индивидуального проекта состав команды — один студент.
Реального reviewer для ЛР5 пригласить отдельно, по согласованию с преподавателем.

## 3 Подключить GitHub и настройки

Сначала прочитать раздел контрольных веток IMPLEMENTATION_STATUS_RU.md.
После просмотра файлов опубликуйте подготовленные ветки без force:

```powershell
Set-Location D:\StockFlow
git push -u origin codex/lab4-ready
git push origin codex/lab5-ready codex/lab6-ready codex/lab7-ready codex/lab8-manual-ready
# Если dev/prod ещё не существуют, создаём их от этапа ЛР4, НЕ от финального HEAD.
git branch dev codex/lab4-ready
git branch prod codex/lab4-ready
git push origin dev prod
```

Если dev/prod уже есть, `git branch` остановится; сравните историю, не удаляйте ветки.
Не выполняйте reset/force. Финальную ветку публиковать отдельно, когда проверите её.

В TeamCity создать проект From repository URL `https://github.com/VladislavG32/stockflow.git`.
Если доступно обнаружение Kotlin DSL — выбрать `.teamcity/settings.kts`. Иначе создать
пустой проект, VCS root Settings на `refs/heads/codex/lab4-ready`, включить Versioned
Settings → Kotlin → использовать существующие настройки из VCS (не перезаписать
репозиторий сгенерированными пустыми настройками). Settings root без feature branchSpec.
В build settings выбрать Always use current settings; не загружать настройки из
ветки конкретной сборки. Названия пунктов могут отличаться в minor-релизе.

Build Source из DSL: URL GitHub, default refs/heads/dev, branchSpec `+:refs/heads/*`.
Для чтения публичного repo credentials Anonymous. Checkout mode On agent и clean
checkout включить для всех конфигураций. Test connection должен пройти.
Для первых реальных сборок нужен агент: выполните раздел запуска агента ЛР5 уже
сейчас; функциональное изменение ЛР5 при этом ещё не переносится в DEV.

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

В `01 Verify all branches` запустить dev, prod, feature/labs4-8-preparation или
специальную feature-ветку от lab4-ready. Последняя для чистой демонстрации ЛР4 лучше:

```powershell
git branch feature/lab4-ci codex/lab4-ready
git push -u origin feature/lab4-ci
```

Успех означает зелёные шаги lint/typecheck/unit/build и docker build. Для dev/prod
следом должен выполниться Publish и появиться тег `<ветка>-<полный SHA>`; для feature
публикации быть не должно. Проверить лог, SHA checkout и digest в release.env.
Скриншоты делать после реального завершения каждой ветки, затем Tags Docker Hub.
Не запускать существующий final feature в раннем проекте, если не готовы к его
дополнительным тестам (они изолированы от VM-баз, но требуют ресурсов).

## Ошибки

- Нет docker Engine: запустить Docker Desktop, дождаться `docker info`; CLI отдельно недостаточно.
- Pending/No compatible agent: авторизовать stockflow-test-agent и проверить его имя.
- 401 Docker Hub: scope токена, username, IMAGE_REPO. Не печатать token.
- OOM/137: один агент, последовательные сборки, проверить RAM/диск, использовать хост.
- DSL dependency not found: `.teamcity/pom.xml` использует plugin repository вашего сервера.
  После запуска сервера на Windows с JDK21+ и Maven: `mvn -f .teamcity/pom.xml -U teamcity-configs:generate`.
  Это проверка генерации XML, не запуск сборки приложения.
- Тега TeamCity нет: сверить официальный Docker Hub, выбрать одинаковую доступную
  версию server/agent и соответствующий API DSL; не заменять на latest молча.

## Вопросы и защита на 5–7 минут

1 минута: показать исходный ЛР3 и его ручной push. 1 минута: server, администратор,
индивидуальный состав команды. 2 минуты: VCS root, ветки, шаги, агент.
1–2 минуты: реальные успешные сборки и теги; feature не публикуется.
Закончить объяснением: CI обнаруживает ошибку до доставки; digest фиксирует содержимое,
секреты находятся в TeamCity. Возможные вопросы: server vs agent; tag vs digest;
почему нет БД при build; почему server на Windows; почему нет фиктивных участников.
