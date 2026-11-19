> АРХИВ до финальной подготовки PR №1 от 16.11.2026. Команды и сведения о внешней инфраструктуре исторические; не выполнять как текущий план. Актуальные инструкции: [подготовка PR](../PRE_MERGE_PR1_RU.md), [ЛР №4](../LAB4_STEPS_RU.md).

> Историческая подготовка ЛР №4–8. Сохранена для продолжения; не является отчётом об их выполнении. Актуальное состояние на 13.11.2026: [аудит](../PRE_LAB5_AUDIT_RU.md), [ветки](../BRANCHES_RU.md), [указатель](../README.md).

# Безопасное обновление контрольных версий

Исправления добавляются обычными коммитами и merge в порядке:

```text
prep/lab4-ci
  → prep/lab5-delivery
  → prep/lab6-static-analysis
  → prep/lab7-testing
  → prep/lab8-migrations
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
git push origin prep/lab4-ci
git push origin prep/lab5-delivery
git push origin prep/lab6-static-analysis
git push origin prep/lab7-testing
git push origin prep/lab8-migrations
git push origin feature/labs4-8-preparation
```

Если push rejected/non-fast-forward — остановиться, изучить `git log --graph --oneline
--all`, сохранить чужие/новые коммиты обычным merge, решить конфликты и снова проверить
набор SQL/функций. Не использовать force, rebase, reset для замены remote-истории.
Эти push здесь НЕ выполнялись. Исходные feature/lab3-stockflow/main не обновлять.

У вас уже могут существовать dev/prod на b0b4fb9. Для текущей ЛР4 создать PR:

```powershell
git switch -c fix/lab4-linux-ci prep/lab4-ci
git push -u origin fix/lab4-linux-ci
```

В GitHub PR fix/lab4-linux-ci → dev; после review merge. Для демонстрации prod
аналогичный обычный PR из prep/lab4-ci → prod. Не переносить финальную ветку
в dev/prod на этапе ЛР4. Прямой fast-forward допустим только если правила GitHub
это разрешают и remote не содержит других коммитов; PR понятнее для защиты.

После merge выбрать Versioned Settings root prep/lab4-ci и Always current settings,
а build source оставить dev. Новая CI имеет новые admin/credential records: создать
секреты Publish на ней заново, непрозрачные credentialsJSON от старого Server не копировать.
Следующие ЛР переходят по ready-веткам через собственные feature/PR как раньше.
Старые prep-теги — исторические промежуточные точки; выполнять по updated ready-веткам.
