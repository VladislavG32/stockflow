# Безопасное обновление контрольных версий

Исправления добавляются обычными коммитами и merge в порядке:

```text
codex/lab4-ready
  → codex/lab5-ready
  → codex/lab6-ready
  → codex/lab7-ready
  → codex/lab8-manual-ready
  → feature/labs4-8-preparation
```

Ни один старый commit не переписан. Для проверки до push: предыдущая вершина каждой
ветки должна быть её предком (`git merge-base --is-ancestor OLD_SHA BRANCH`).
ЛР4–7 содержат только0000, ручная ЛР8 —0000/0001, финальная —0000/0001/0002.
Функции цены/накладной не попадают в ранние контрольные версии через исправления.

Windows PowerShell, после проверки локальных файлов:

```powershell
Set-Location D:\StockFlow
git status --short
git fetch origin
git push origin codex/lab4-ready
git push origin codex/lab5-ready
git push origin codex/lab6-ready
git push origin codex/lab7-ready
git push origin codex/lab8-manual-ready
git push origin feature/labs4-8-preparation
```

Если push rejected/non-fast-forward — остановиться, изучить `git log --graph --oneline
--all`, сохранить чужие/новые коммиты обычным merge, решить конфликты и снова проверить
набор SQL/функций. Не использовать force, rebase, reset для замены remote-истории.
Эти push здесь НЕ выполнялись. Исходные feature/lab3-stockflow/main не обновлять.

У вас уже могут существовать dev/prod на b0b4fb9. Для текущей ЛР4 создать PR:

```powershell
git switch -c fix/lab4-linux-ci codex/lab4-ready
git push -u origin fix/lab4-linux-ci
```

В GitHub PR fix/lab4-linux-ci → dev; после review merge. Для демонстрации prod
аналогичный обычный PR из codex/lab4-ready → prod. Не переносить финальную ветку
в dev/prod на этапе ЛР4. Прямой fast-forward допустим только если правила GitHub
это разрешают и remote не содержит других коммитов; PR понятнее для защиты.

После merge выбрать Versioned Settings root codex/lab4-ready и Always current settings,
а build source оставить dev. Новая CI имеет новые admin/credential records: создать
секреты Publish на ней заново, непрозрачные credentialsJSON от старого Server не копировать.
Следующие ЛР переходят по ready-веткам через собственные feature/PR как раньше.
Старые prep-теги — исторические промежуточные точки; выполнять по updated ready-веткам.
