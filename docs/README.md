# Документация StockFlow

Актуальная точка входа — [основной README](../README.md). Результаты новой проверки от 13 ноября 2026: [PRE_LAB5_AUDIT_RU](PRE_LAB5_AUDIT_RU.md); состояние веток: [BRANCHES_RU](BRANCHES_RU.md).

## Приложение и ЛР №1–4

- [DEFENSE_GUIDE_RU](DEFENSE_GUIDE_RU.md) — устройство приложения на этапе ЛР №3; внешний вид теперь обновлён.
- [LAB3_STEPS_RU](LAB3_STEPS_RU.md) — команды контейнеризации для отдельных стендов.
- [VERIFICATION_RU](VERIFICATION_RU.md) — исторический журнал локальных проверок октября; не результаты текущего запуска.
- [LAB4_STEPS_RU](LAB4_STEPS_RU.md) и [LINUX_CI_SETUP_RU](LINUX_CI_SETUP_RU.md) — подготовка Linux CI.

## Подготовительные материалы, а не отчёты о сдаче

[IMPLEMENTATION_STATUS_RU](IMPLEMENTATION_STATUS_RU.md), [AUDIT_LABS4_8_RU](AUDIT_LABS4_8_RU.md), [INFRA_AUDIT_RU](INFRA_AUDIT_RU.md), [CI_CD_ARCHITECTURE_RU](CI_CD_ARCHITECTURE_RU.md), [PROJECT_DEFENSE_RU](PROJECT_DEFENSE_RU.md), [NEXT_STEPS_RU](NEXT_STEPS_RU.md), [BRANCH_UPDATE_RU](BRANCH_UPDATE_RU.md) описывают ранее подготовленную последовательность и ограничения. Утверждения о ветках и публикации привязаны к времени написания; текущие SHA приведены в BRANCHES_RU.

Инструкции [ЛР №5](LAB5_STEPS_RU.md), [№6](LAB6_STEPS_RU.md), [№7](LAB7_STEPS_RU.md), [№8](LAB8_STEPS_RU.md) сохранены для продолжения. Текущая ветка содержит схему только `0000`, поэтому команды будущих этапов нельзя выполнять в ней без выбора нужного контрольного состояния. Реальное выполнение на VM, сдача и скриншоты должны подтверждаться отдельно.

Исторические файлы сохранены; текущий аудит имеет приоритет для состояния этой ветки. Новые UI/UX-изменения следует переносить в будущие контрольные ветки отдельно, разрешая конфликты без возврата к старым зависимостям и без переноса миграций назад.
