# Лабораторная работа №6. Статический анализ

В Verify используются два вида анализа исходного кода. ESLint с `eslint-config-next`
проверяет JavaScript, TypeScript, React и Next.js, включая Node.js-скрипты проекта.
Gitleaks 8.30.1 ищет секреты по встроенным правилам и учебному правилу из
`.gitleaks.toml`. Semgrep поддерживает SAST для JavaScript/TypeScript и правил
фреймворков. SonarQube Server поддерживает анализ качества JavaScript/TypeScript,
но требует сервер и сканер. Для двух выбранных видов анализа достаточно
существующего ESLint и одного контейнера Gitleaks.

## Шаги Verify

1. **Static Analysis — ESLint** проверяет ресурсы агента, устанавливает зависимости
   через `npm ci` в Node 24 и выполняет `npm run lint`. ESLint имеет уровни
   warning и error. Сборка прерывается при любой ошибке, а `--max-warnings=0`
   также блокирует любое предупреждение. BLOCKER в задании обозначает порог
   остановки сборки, у ESLint уровень с таким названием отсутствует.
2. **Secret Scan — Gitleaks** проверяет отслеживаемые файлы текущего коммита
   из `git archive HEAD`. История Git, локальный `.env` и артефакты в снимок
   не попадают. При необходимости история проверяется отдельно командой
   `gitleaks git` с теми же правилами и маскированием. Любая находка даёт код 1,
   а любой ненулевой код останавливает Verify. Режим `--redact=100` скрывает
   найденное значение в журнале и JSON.
3. **Linux CI: проверки, сборка и архив образов** повторно использует
   `node_modules` в том же чистом checkout. Выполняет typecheck, инфраструктурные
   и модульные тесты, production build и подготавливает архивы образов.

TeamCity останавливает последовательность шагов при ненулевом коде. Журнал
ESLint и JSON Gitleaks доступны в `checks/eslint.log` и `checks/gitleaks.json`.
Автоматические триггеры Publish и Stage отключены.

## Воспроизводимая проверка

На Linux-агенте с Docker из корня чистого checkout:

```bash
bash scripts/ci/lint.sh
bash scripts/ci/static.sh
bash scripts/demo/secret.sh
```

Демонстрация создаёт синтетическую метку во временном каталоге и проверяет код 1,
идентификатор правила и путь файла. Для проверки остановки Verify на ESLint
добавьте в отдельной демонстрационной ветке временный TypeScript-файл:

```ts
export function lab6Probe(value: any) { return value; }
```

Ожидается ошибка `@typescript-eslint/no-explicit-any`. Проверьте в логе Verify,
что последующие шаги пропущены. Демонстрационный коммит остаётся в отдельной ветке.

Источники: [Next.js ESLint](https://nextjs.org/docs/app/api-reference/config/eslint),
[ESLint CLI](https://eslint.org/docs/latest/use/command-line-interface.html),
[Gitleaks 8.30.1](https://github.com/gitleaks/gitleaks/releases/tag/v8.30.1),
[Semgrep](https://semgrep.dev/products/integrations/),
[SonarQube](https://docs.sonarsource.com/sonarqube-server/analyzing-source-code/languages/javascript-typescript-css).
