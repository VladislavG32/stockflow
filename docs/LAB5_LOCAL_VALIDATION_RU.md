# Локальная проверка ЛР №5

Дата: 16 ноября 2026 года. Среда: Windows, D:\StockFlow, Git Bash. VM и TeamCity выключены.
Основа: origin/dev `1cc04cb9e1a24b42bfc5e848dfd3c8fc0511e2f5`; ветка feature/lab5-zero-stock.
Рабочее дерево до начала было чистым. Выполнен git fetch; подготовительные файлы перенесены выборочно, без merge prep.

| Проверка | Результат |
| --- | --- |
| npm ci | Успех, установлено 375 пакетов. npm сообщает 11 moderate vulnerabilities; lockfile не изменён |
| npm run lint | Успех, 0 warnings |
| npm run typecheck | Успех, next typegen и tsc --noEmit |
| npm test | 11/11 |
| npm run test:infra | 33/33 |
| npm run build | Production build Next.js 16.4.6 успешен |
| bash -n | Все scripts/ci/*.sh и scripts/ops/*.sh, включено в infra tests |
| git apply --check docs/lab5-ui-compatibility.patch | Успех до применения патча |
| git diff --check | Успех |
| Kotlin DSL 2026.2 | Maven teamcity-configs:generate, offline, JDK 21.0.13, BUILD SUCCESS |

Kotlin DSL проверен Maven 3.9.9 с `-o -f .teamcity/pom.xml -Dteamcity.server.url=http://192.168.56.11:8111 teamcity-configs:generate` на JDK 21.0.13 из локальных зависимостей Maven. Сгенерированы Verify, Publish, Stage и Source. В XML Publish/Stage триггеры disabled, Stage зависит от Publish и получает release.env по sameChain. Локальная генерация не является импортом в TeamCity. Первоначальный запуск на JDK 17 был отклонён: API 2026.2 требует Java 21; успешная проверка выполнена на JDK 21.

Инфраструктурные тесты используют настоящий Bash, tar, gzip и SHA-256. Docker, SSH и ресурсный preflight в сценариях доставки заменены тестовыми функциями. Модели подтверждают порядок/аргументы команд и обработку ошибок, не работоспособность реального Docker Engine или SSH.

Проверены: нулевой остаток при нулевом и ненулевом минимуме; сочетание с поиском, категорией и сортировкой; неизменность входного массива; повреждённые/утраченные/лишние части архива; отсутствующий и некорректный манифест частей; traversal; неверная полная SHA-256; invalid gzip/tar; legacy и смешанный формат; другой revision образа; запрет Publish feature; неверные digest и аргументы; обязательные target.env переменные; неверный том; занятая блокировка; pull failure; update failure; readiness failure; успешный автоматический/ручной rollback; явный отказ rollback; манифест release как данные; несовпадение checkout SHA; безопасная последовательность SSH.

Не запускались: реальный Publish/Deploy, миграции, интеграционный сценарий с записью в PostgreSQL, VM, Docker build/push на стенды. Реальные артефакты/состояние TeamCity, STAGE и сохранность SQL-данных ещё требуют проверки.
Полные локальные логи хранятся вне Git в D:\StockFlow-Audit\Lab5. Исторические скриншоты PR №1 не выдаются за доказательства ЛР №5.
