# Linux инфраструктура без Windows Docker

## Решение и точки остановки

Предлагается НОВАЯ VM CI: Ubuntu Server24.04 LTS amd64, hostname stockflow-ci,
4 vCPU, 8 ГБ RAM, динамический диск60 ГБ (раздел расширить до размера диска),
Adapter1 NAT (Internet), Adapter2 та же Host-Only сеть, что у TEST/STAGE/PROD.
Предлагаемый IP192.168.56.14 НЕ считается занятым/назначенным: сначала проверить
VirtualBox DHCP/список VM и отсутствие конфликта. У CI нет пользовательской PostgreSQL.
VM пока не создана. На Windows — только VirtualBox, PowerShell, SSH, Git, браузер.

Перед созданием на Windows PowerShell:

```powershell
Get-CimInstance Win32_OperatingSystem | Select-Object FreePhysicalMemory,TotalVisibleMemorySize
```

Нужны свободные8ГБ плюс запас Windows. Для ЛР5–8 одновременно CI8+TEST4+STAGE4
требуют16ГБ гостевой RAM плюс RAM Windows; с PROD ещё4ГБ. Учесть это в бюджете
ноутбука, а не только размер одной VM. Не включать все VM сразу при нехватке RAM:
PROD до ЛР8 можно штатно завершить из Ubuntu, сохранив диск. Если8ГБ выделить нельзя,
не запускать CI рядом с рабочей PostgreSQL4ГБ; сначала выбрать домашний Linux-сервер
и подтвердить связь по разделу ниже. Дополнительное оборудование покупать не нужно.
Скриншот: параметры новой CI VM и результат проверки ресурсов. На защите:
«Сборки вынесены с TEST; её4ГБ нужны рабочему приложению и проверочным контейнерам».

## 1 Сеть новой CI VM

После установки Ubuntu выбрать своего SSH-пользователя (далее ubuntu — пример).
На CI через консоль VirtualBox:

```bash
hostnamectl
ip -br address
ip route
sudo hostnamectl set-hostname stockflow-ci
```

Имена интерфейсов определить по выводу, не копировать enp0s8 вслепую. В netplan
для NAT оставить DHCP; Host-Only добавить статический192.168.56.14/24 БЕЗ gateway
и БЕЗ default route. Пример блока существующего YAML:

```yaml
network:
  version: 2
  ethernets:
    enp0s3:
      dhcp4: true
    enp0s8:
      addresses: [192.168.56.14/24]
```

Редактировать фактический файл `ls /etc/netplan`, затем из консоли VM:

```bash
sudo netplan try
ip -br address
ip route
curl -I --connect-timeout 10 https://github.com
```

Подтвердить netplan только при корректной сети. NAT должен оставаться единственным
маршрутом по умолчанию. Windows:

```powershell
Test-NetConnection 192.168.56.14 -Port 22
ssh ubuntu@192.168.56.14
```

Скриншот: IP и успешный SSH. На защите: «Host-Only связывает стенды, NAT даёт Internet».

## 2 Docker Engine только на новой CI

На новой CI VM, не на существующих TEST/STAGE/PROD:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl git
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
sudo tee /etc/apt/sources.list.d/docker.sources >/dev/null <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: noble
Components: stable
Architectures: amd64
Signed-By: /etc/apt/keyrings/docker.asc
EOF
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"
exit
```

Заново войти по SSH: членство группы применяется к новой сессии. Затем на CI:

```bash
docker version
docker compose version
docker buildx version
free -h
df -h /
```

Это установка с [официального apt-репозитория Docker](https://docs.docker.com/engine/install/ubuntu/).
Если выбран домашний сервер с Docker, не переустанавливать его и не удалять пакеты.
Скриншот: версии Engine/Compose/Buildx. На защите: «Docker работает на Ubuntu, Windows-клиент не запускает контейнеры».

## 3 Server и сборочный агент

CI Linux, из отдельного clone (не рабочего каталога приложения):

```bash
git clone -b codex/lab4-ready https://github.com/VladislavG32/stockflow.git ~/stockflow-ci-config
cd ~/stockflow-ci-config
sudo install -d -m 700 -o "$USER" -g "$(id -gn)" /opt/stockflow-ci
cp infra/teamcity/linux.env.example /opt/stockflow-ci/teamcity.env
chmod 600 /opt/stockflow-ci/teamcity.env
nano /opt/stockflow-ci/teamcity.env
bash scripts/ci/preflight.sh server
docker compose --env-file /opt/stockflow-ci/teamcity.env -f infra/teamcity/compose.server.yaml config --quiet
docker compose --env-file /opt/stockflow-ci/teamcity.env -f infra/teamcity/compose.server.yaml up -d
docker compose --env-file /opt/stockflow-ci/teamcity.env -f infra/teamcity/compose.server.yaml logs --tail 60 server
sudo mkdir -p /opt/buildagent/{work,temp,system,tools,plugins} /opt/stockflow-ci/buildx
sudo bash scripts/ci/create-builder.sh
docker compose --env-file /opt/stockflow-ci/teamcity.env -f infra/teamcity/compose.build-agent.yaml up -d
docker compose --env-file /opt/stockflow-ci/teamcity.env -f infra/teamcity/compose.build-agent.yaml exec -T agent docker buildx version
docker compose --env-file /opt/stockflow-ci/teamcity.env -f infra/teamcity/compose.build-agent.yaml exec -T agent docker compose version
```

В private env для выбранного адреса:

```bash
TEAMCITY_BIND_ADDRESS=192.168.56.14
TEAMCITY_SERVER_URL=http://192.168.56.14:8111
```

У build-agent отдельное имя stockflow-build-agent, у TEST — stockflow-test-agent.
BuildKit создан root, его конфигурация /opt/stockflow-ci/buildx смонтирована в build-agent
по тому же пути; переменная BUILDX_CONFIG одинакова. Не создавать builder от другого
пользователя в ~/.docker: агент не увидит такую конфигурацию. Лимит BuildKit3ГБ,
Server2300МБ, агент768МБ. Контейнер npm2300МБ запускается ДО Docker build, не вместе.
Важна сумма потребления, mem_limit агента не ограничивает Docker daemon.

Windows:

```powershell
Test-NetConnection 192.168.56.14 -Port 8111
```

В браузере открыть http://192.168.56.14:8111. Создать администратора, выбрать встроенную
учебную БД TeamCity и бесплатный режим; авторизовать stockflow-build-agent в Agents.
Скриншот: Server, агент и `docker stats --no-stream` на CI. На защите объяснить,
что БД TeamCity не связана с данными склада. Server volumes сохраняют конфигурацию.
Не публиковать8111 на0.0.0.0/NAT/Internet. Docker published ports могут обходить UFW:
безопасность здесь основана на bind Host-Only/VPN и изоляции сети, не одном UFW.

Если нужен дополнительный SSH-туннель для браузера (не для агентов), Windows:

```powershell
ssh -N -L 8111:192.168.56.14:8111 ubuntu@192.168.56.14
```

Тогда браузер localhost:8111; агент ВСЕГДА использует частный адрес CI, а не Windows.
Отсутствие туннеля Windows не должно останавливать сборки.

## 4 Проверить TEST до запуска его агента

На TEST, отдельный checkout конфигурации из ЛР4/5, не ~/stockflow рабочего приложения:

```bash
git clone -b codex/lab4-ready https://github.com/VladislavG32/stockflow.git ~/stockflow-ci-config
cd ~/stockflow-ci-config
sudo install -d -m 700 -o "$USER" -g "$(id -gn)" /opt/stockflow-ci
cp infra/teamcity/linux.env.example /opt/stockflow-ci/teamcity.env
chmod 600 /opt/stockflow-ci/teamcity.env
nano /opt/stockflow-ci/teamcity.env
curl --fail --connect-timeout 5 http://192.168.56.14:8111/login.html
sudo mkdir -p /opt/buildagent/{work,temp,system,tools,plugins}
install -d -m 700 /opt/stockflow-ci/ssh
docker compose --env-file /opt/stockflow-ci/teamcity.env -f infra/teamcity/compose.agent.yaml config --quiet
docker compose --env-file /opt/stockflow-ci/teamcity.env -f infra/teamcity/compose.agent.yaml up -d
docker compose --env-file /opt/stockflow-ci/teamcity.env -f infra/teamcity/compose.agent.yaml exec -T agent curl --fail --connect-timeout 5 http://192.168.56.14:8111/login.html
```

Если clone уже есть — пропустить clone, `cd` в него. Проверка ВНУТРИ контейнера
существенна: localhost и сетевой маршрут хоста недостаточны. Авторизовать TEST в UI. Если старый agent_conf сохранил адрес18111, проверить
только URL (не печатать весь файл с authorizationToken):

```bash
docker compose --env-file /opt/stockflow-ci/teamcity.env -f infra/teamcity/compose.agent.yaml exec -T agent sh -c 'grep "^serverUrl=" /data/teamcity_agent/conf/buildAgent.properties'
```

При старом URL обновить его, затем restart agent и повторная авторизация на НОВОМ сервере:

```bash
docker compose --env-file /opt/stockflow-ci/teamcity.env -f infra/teamcity/compose.agent.yaml exec -T agent sh -c 'sed -i "s|^serverUrl=.*|serverUrl=$SERVER_URL|" /data/teamcity_agent/conf/buildAgent.properties'
docker compose --env-file /opt/stockflow-ci/teamcity.env -f infra/teamcity/compose.agent.yaml restart agent
```

Не удалять agent_conf и не копировать токены старого сервера. 
Ни Server, ни build-agent на TEST не запускать. TEST не нужен для первых сборок ЛР4;
он обязателен для доставки ЛР5 и Acceptance ЛР7/8. Скриншот: два разных агента и их
параметры Linux. На защите: «Один агент собирает, второй испытывает и доставляет».

## Матрица доступности

| Откуда | Куда | Для чего и проверка |
|---|---|---|
| Windows | CI TCP22/8111 | SSH/браузер, Test-NetConnection |
| CI build-agent | CI private TCP8111 | связь агента, curl из контейнера |
| TEST agent | CI private TCP8111 | задания и большие artifacts, curl из контейнера |
| TEST agent | STAGE TCP22, позднее PROD TCP22 | ssh BatchMode + сверенный known_hosts |
| CI/TEST/STAGE/PROD | Internet TCP443/DNS | GitHub, npm на CI, registry/pull на стендах |
| App каждого стенда | собственный db:5432 | внутренняя Compose-сеть; БД наружу не публикуется |

На TEST: `ip route get 192.168.56.14`, `ip route get 192.168.56.12`.
На CI: `getent hosts github.com`, `curl -I https://registry-1.docker.io/v2/`.
HTTP401 registry означает, что registry достижим и требует аутентификацию.
Нет соединения → остановиться и исправить адрес/маршрут/firewall. Успех этих команд
предстоит получить самостоятельно; в ходе подготовки VM не подключались.

## Домашний Ryzen9950X/64ГБ как альтернатива

Мощность достаточна по заявленным параметрам, Linux/Docker/диск/маршрут неизвестны.
Можно разместить ту же CI Linux VM на нём либо использовать отдельное Linux-окружение
хоста. VirtualBox Host-Only192.168.56.0/24 сам по себе НЕ маршрутизируется через Internet.
Сначала организовать частную LAN/VPN-связь CI↔TEST и Windows↔CI, затем повторить
матрицу curl/SSH из контейнеров. Одного SSH с Windows к серверу недостаточно.
Прямой публичный8111 и Docker API2375 открывать нельзя. Если WireGuard — нужны
достижимый endpoint/UDP и проверка handshake; за CGNAT это нельзя считать готовым.
Адрес VPN/LAN подставить в TEAMCITY_BIND_ADDRESS/TEAMCITY_SERVER_URL на CI и TEST.
STAGE/PROD остаются доступны через существующий TEST, домашнему CI не нужно
предполагать прямой маршрут к192.168.56.12/13. Пока проверки не прошли, основной
воспроизводимый вариант — отдельная CI VM в той же Host-Only сети.

## Диск и ошибки

CI60ГБ нужны для TeamCity artifacts, Docker layers и BuildKit cache. TEST25ГБ
принимает три готовых образа и архив. Preflight требует12ГБ свободно на CI build,
6ГБ на TEST acceptance; при нехватке задача остановится до загрузки/сборки.
В TeamCity задать cleanup artifacts: хранить несколько последних успешных цепочек,
не удалять pinned build, нужный для PROD; экспортировать нужные digest/логи в отчёт.
Не запускать `docker system prune --volumes`, `down -v` и массовую очистку.
После просмотра `docker image ls` можно удалить ТОЛЬКО конкретные старые CI-теги,
которые не используются контейнерами; рабочие образы и backup сохранять.
Повреждённый архив/нехватка RAM/503 → сборка красная, Publish/Stage не продолжаются.

## Проверка Kotlin DSL без установки Maven на Windows

На CI Linux из clone выбранной ready-ветки (после Server startup):

```bash
set -a
source /opt/stockflow-ci/teamcity.env
set +a
docker run --rm --memory=1600m -e TEAMCITY_SERVER_URL -e MAVEN_OPTS=-Xmx1g -v "$PWD:$PWD" -w "$PWD" maven:3.9.11-eclipse-temurin-21 mvn -f .teamcity/pom.xml -U teamcity-configs:generate
```

POM берёт plugin repository из TEAMCITY_SERVER_URL, не из Windows localhost.
Ожидается BUILD SUCCESS и .teamcity/target/generated-configs. Это проверка DSL,
не выполнение приложения. При ошибке URL сначала curl из контейнера и версия JDK21.
