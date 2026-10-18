# Контрольные ветки и коммиты подготовки

Все ссылки локальные; push ещё не выполнялся. Ready-ветки находятся в истории итоговой
ветки и разделяют этапы. Первоначальные prep-теги сохранены, но для защиты берите ready.

| Ветка | Проверяемый commit на момент реестра |
|---|---|
| codex/lab4-ready | `b0b4fb997d88366af93d3746fe78ffb3cd388d12` |
| codex/lab5-ready | `7a1bb8651ad1ad731ccfccc3ef14c336d29b65a6` |
| codex/lab6-ready | `2e15945aa92834462e05fdb86128403236d00481` |
| codex/lab7-ready | `38b78ff6c8d92969cd9f661cf09ab1ff66483d82` |
| codex/lab8-manual-ready | `a0164ef02050ad87b3ed2f54e474613d2dfdde62` |
| feature/labs4-8-preparation | `5b868e236b32590efa011f1365acfdee6b182315` |

Итоговая ветка после этого реестра может содержать дополнительные коммиты документации.
Актуальный указатель всегда проверяется `git rev-parse feature/labs4-8-preparation`.

## Коммиты, добавленные после ЛР3

```text
49697f5 ci(lab4): prepare TeamCity branch checks and immutable Docker publication
1c0227a feat(lab5): add zero-stock filter and guarded SSH delivery to STAGE
baf9683 ci(lab6): block secrets with Gitleaks and protect agent transport
bdc9474 test(lab7): add API units and disposable PostgreSQL acceptance pipeline
d6edf0a feat(lab8): add receipt prices and separate manual STAGE migration phase
981fb0f ci(lab8): rehearse migrations on restored backup and manually promote STAGE to PROD
b343d26 fix(ci): validate DSL and SQL, verify migration hashes and preserve staged data
55f7bd2 fix(lab4): verify DSL references and provide isolated demonstration instructions
08cf3b0 feat(lab5): prepare separately demonstrable stage without future migrations
c3443dc feat(lab6): prepare separately demonstrable stage without future migrations
fdb6960 feat(lab7): prepare separately demonstrable stage without future migrations
7735b46 feat(lab8): isolate manually applied receipt price migration before automation
1e69b56 docs(labs4-8): add Russian walkthroughs, defense map and honest verification status
7d31e33 fix(ci): preserve failing exit codes before production build
a475964 merge: connect sequential lab checkpoints with final automated migration stage
b0b4fb9 fix(ci): preserve default DEV routing and remove repeated state writes
b4593d4 Merge branch 'codex/lab4-ready' into codex/lab5-ready
d13ae92 fix(lab8): normalize default branch filters and immutable artifact inputs
7a1bb86 fix(ci): preserve default DEV routing and remove repeated state writes
d80df08 Merge branch 'codex/lab5-ready' into codex/lab6-ready
2e15945 fix(ci): preserve default DEV routing and remove repeated state writes
38b78ff Merge branch 'codex/lab6-ready' into codex/lab7-ready
0e40a2b fix(teamcity): route default DEV safely and use full trigger configuration IDs
5fe8b38 Merge branch 'codex/lab8-manual-ready' into feature/labs4-8-preparation
a0164ef Merge branch 'codex/lab7-ready' into codex/lab8-manual-ready
5b868e2 Merge branch 'codex/lab8-manual-ready' into feature/labs4-8-preparation
```

Ни одного изменения исходного коммита ЛР3 нет. Первоначальные SQL0000 и отчёты ЛР3
сохранены. У каждой готовой ветки ЛР4–7 только0000; у ручной ЛР8 —0000/0001.
Финальная версия добавляет0002. Переходы оформлены обычными коммитами/merge, без rebase/force.
