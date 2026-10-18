# Контрольные ветки и коммиты подготовки

Все ссылки локальные; push ещё не выполнялся. Ready-ветки находятся в истории итоговой
ветки и разделяют этапы. Первоначальные prep-теги сохранены, но для защиты берите ready.

| Ветка | Проверяемый commit на момент реестра |
|---|---|
| codex/lab4-ready | `b742e5aa1c9708b5925f6b5c13c7edf71c47aa8f` |
| codex/lab5-ready | `b25df84931dd74bfffa9924ba15a28406784480c` |
| codex/lab6-ready | `b9a4c118bd3cc3fffa26050a5ccb2bf108c581c3` |
| codex/lab7-ready | `946576365cdd01c607e9fa7f40441aa0be7df620` |
| codex/lab8-manual-ready | `fc87d16e981f0af33bac7f72a7378ee64bd5d380` |
| feature/labs4-8-preparation | `72c515e559f09fe0ddd2b1ec6f9df3c7b35065f6` |

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
b4593d4 Merge branch 'codex/lab4-ready' into codex/lab5-ready
d13ae92 fix(lab8): normalize default branch filters and immutable artifact inputs
b0b4fb9 fix(ci): preserve default DEV routing and remove repeated state writes
d80df08 Merge branch 'codex/lab5-ready' into codex/lab6-ready
7a1bb86 fix(ci): preserve default DEV routing and remove repeated state writes
2e15945 fix(ci): preserve default DEV routing and remove repeated state writes
38b78ff Merge branch 'codex/lab6-ready' into codex/lab7-ready
0e40a2b fix(teamcity): route default DEV safely and use full trigger configuration IDs
5fe8b38 Merge branch 'codex/lab8-manual-ready' into feature/labs4-8-preparation
a0164ef Merge branch 'codex/lab7-ready' into codex/lab8-manual-ready
5b868e2 Merge branch 'codex/lab8-manual-ready' into feature/labs4-8-preparation
1411d97 test(labs4-8): verify published candidates, migration drift and staged defense workflows
c41a79d Merge branch 'codex/lab8-manual-ready' into feature/labs4-8-preparation
43c54ee fix(lab8): preserve schema export checksums with LF line endings
dbae70f docs: record final staged branch references and verification commits
deab69c fix(ci): move TeamCity builds to dedicated Linux and test immutable bundles on TEST
96b525e fix(teamcity): use explicit private server URL for DSL plugin resolution
769867d fix(lab4): use Linux CI builder and preserve staged TEST responsibilities
bd17454 fix(lab5): use Linux CI builder and preserve staged TEST responsibilities
027633a fix(lab6): use Linux CI builder and preserve staged TEST responsibilities
3e94d90 fix(lab7): use Linux CI builder and preserve staged TEST responsibilities
27c2ca4 fix(lab8): use Linux CI builder and preserve staged TEST responsibilities
f7545b2 merge: propagate Linux infrastructure fixes through all laboratory checkpoints
a022cc9 fix(compose): run prebuilt acceptance images with supported no-pull options
f8916bc fix(lab7): use supported Compose run flags for prebuilt test images
8ebbc5e Merge branch 'codex/lab7-ready' into codex/lab8-manual-ready
13fd783 Merge branch 'codex/lab8-manual-ready' into feature/labs4-8-preparation
4334b2b docs(ci): record verified Linux audit and clarify host memory budget
b742e5a docs(lab4): clarify Linux setup and preserve actual audit evidence
b25df84 Merge branch 'codex/lab4-ready' into codex/lab5-ready
b9a4c11 Merge branch 'codex/lab5-ready' into codex/lab6-ready
9465763 Merge branch 'codex/lab6-ready' into codex/lab7-ready
fc87d16 Merge branch 'codex/lab7-ready' into codex/lab8-manual-ready
72c515e Merge branch 'codex/lab8-manual-ready' into feature/labs4-8-preparation
```

Ни одного изменения исходного коммита ЛР3 нет. Первоначальные SQL0000 и отчёты ЛР3
сохранены. У каждой готовой ветки ЛР4–7 только0000; у ручной ЛР8 —0000/0001.
Финальная версия добавляет0002. Переходы оформлены обычными коммитами/merge, без rebase/force.

## Дополнительный аудит Linux

Исправления после dbae70f: Linux CI вместо Windows runtime, отдельный build-agent,
Acceptance на TEST без сборки, tar/checksum вместо rebuild, private URL, resource gates.
Каждый прежний ready commit сохранён в истории. Push не выполнялся. Сначала прочитать
BRANCH_UPDATE_RU.md и NEXT_STEPS_RU.md; dev/prod обновлять только текущим этапом ЛР4.
