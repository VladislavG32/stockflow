"""Build the Lab 5 draft with the bundled Python runtime and reportlab.

Run from repository root. No infrastructure calls are made.
"""
from pathlib import Path
from html import escape
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle

OUT = Path("docs/reports")
OUT.mkdir(parents=True, exist_ok=True)
# Set STOCKFLOW_REPORT_FONT_DIR on non-Windows hosts to a compatible font family.
import os
fonts = Path(os.environ.get("STOCKFLOW_REPORT_FONT_DIR", "C:/Windows/Fonts"))
pdfmetrics.registerFont(TTFont("Report", str(fonts / "times.ttf")))
pdfmetrics.registerFont(TTFont("ReportBold", str(fonts / "timesbd.ttf")))
pdfmetrics.registerFontFamily("Report", normal="Report", bold="ReportBold", italic="Report", boldItalic="ReportBold")
body = ParagraphStyle("Body", fontName="Report", fontSize=14, leading=21, spaceAfter=6, textColor=colors.black, firstLineIndent=12.5*mm, alignment=4)
heading = ParagraphStyle("Heading", parent=body, fontName="ReportBold", fontSize=15, leading=21, spaceBefore=10, spaceAfter=8, keepWithNext=True, firstLineIndent=0, alignment=0)
title = ParagraphStyle("Title", parent=heading, alignment=TA_CENTER, fontSize=19, leading=25, spaceAfter=18)
small = ParagraphStyle("Small", parent=body, fontSize=11, leading=15, firstLineIndent=0, alignment=0)
story, source = [], []

def p(text, style=body):
    story.append(Paragraph(escape(text), style))
    source.append(text + "\n")

def h(text):
    story.append(Paragraph(escape(text), heading))
    source.append("## " + text + "\n")

def page():
    story.append(PageBreak())
    source.append("\n<!-- Разрыв страницы -->\n")

def evidence(number, name, instruction):
    h(f"Рисунок {number}  {name}")
    p(instruction)
    story.append(Spacer(1, 48 * mm))
    p("[Место для настоящего скриншота]", small)
    p("Дата, URL сборки или SHA, фактический результат: __________________", small)

center = ParagraphStyle("Center", parent=body, alignment=TA_CENTER, firstLineIndent=0)
p("МИНИСТЕРСТВО НАУКИ И ВЫСШЕГО ОБРАЗОВАНИЯ РФ", center)
p("Федеральное государственное автономное образовательное учреждение высшего образования", center)
p("«Московский политехнический университет»", center)
story.append(Spacer(1, 22*mm))
p("Дисциплина: «Автоматизация процессов жизненного цикла программных средств»", center)
story.append(Spacer(1, 12*mm))
p("ЛАБОРАТОРНАЯ РАБОТА № 5", title)
p("Непрерывная доставка", title)
p("Проект StockFlow", center)
p("Черновик", center)
story.append(Spacer(1, 20*mm))
p("Выполнил: Остапенко В. Р.", center)
p("Группа: 241-3211", center)
story.append(Spacer(1, 22*mm))
p("Москва 2026", center)
page()
h("Цель и задание")
p("Настроить доставку StockFlow из Docker Hub на STAGE с сохранением PostgreSQL. Подключить агент TeamCity на TEST, добавить функцию в feature-ветке и создать PR в dev. После одобрения другим участником проверить сборку dev и обновление STAGE.")
p("Источник задания: оригинал «Лабораторная работа 5.pdf» из архива курса «Автоматизация процессов жизненного цикла программного обеспечения», пункты 1–7.")
h("Состояние работы")
p("Работа начата от dev после объединения PR №1, коммит 1cc04cb9e1a24b42bfc5e848dfd3c8fc0511e2f5. Изменения опубликованы в feature/lab5-zero-stock. Локальные проверки пройдены. Виртуальные машины выключены, доставка ещё не выполнялась. Для PR требуется одобрение другого участника.")
p("Репозиторий: https://github.com/VladislavG32/stockflow")
p("PR №2: https://github.com/VladislavG32/stockflow/pull/2")

page()
h("Функциональное изменение")
p("Добавлен фильтр «Нет в наличии». Он выбирает материалы с остатком 0, в том числе при нулевом минимальном запасе. Поиск, категории, сортировка и навигация сохранены. Патч совместимости проверен перед применением. Схема БД и миграции не изменены.")
h("Цепочка доставки")
p("Verify собирает образы и сохраняет архив частями с SHA-256. Publish проверяет архив и публикует эти образы без пересборки. Stage получает release.env той же цепочки и сверяет SHA коммита. На STAGE передаются файлы этого коммита по SSH.")
p("Stage разрешён только из dev. Publish и Stage запускаются вручную; автоматические триггеры отключены. В этой работе они не запускались.")
h("Сохранение PostgreSQL и возврат версии")
p("Скрипт сверяет имя хоста, проект Compose и существующий том БД. После проверки digest и SHA образа обновляется только app. Миграции не выполняются, контейнер PostgreSQL и его том сохраняются.")
p("После обновления проверяются /api/ready, image ID приложения и прежний контейнер БД. При ошибке возвращается старый образ и проверка повторяется. Неудачный rollback возвращает код 2. Предыдущая версия также доступна для ручного возврата через rollback-app.sh.")

page()
h("Результаты локальных проверок")
rows = [
    ("Проверка", "Подтверждённый результат"),
    ("npm ci", "Успех, 375 пакетов; 11 moderate vulnerabilities"),
    ("lint и typecheck", "Успех; ESLint без warnings, next typegen и tsc"),
    ("Unit tests", "11 из 11"),
    ("Infrastructure tests", "33 из 33, Docker и SSH подменены"),
    ("Production build", "Next.js 16.4.6, успешно"),
    ("Kotlin DSL 2026.2", "Maven offline, JDK 21, BUILD SUCCESS"),
    ("Bash и Git", "bash -n всех CI/ops скриптов; git diff --check"),
]
table = Table([[Paragraph(escape(a), small), Paragraph(escape(b), small)] for a, b in rows], colWidths=[47*mm, 117*mm])
table.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6), ("LINEBELOW", (0, 0), (-1, 0), .5, colors.black)]))
story.append(table)
source.extend(["| " + a + " | " + b + " |\n" for a, b in rows])
story.append(Spacer(1, 8*mm))
p("Проверены отказы при неверном образе, отсутствии параметров, повреждении архива или SHA-256, другом томе БД и ошибке обновления. Проверены успешный и неуспешный rollback. Docker и SSH в тестах заменены тестовыми командами; реальные стенды не затрагивались.")
page()
h("Инфраструктура")
p("Ранее TeamCity Server обнаружен на TEST http://192.168.56.11:8111; build-agent также запускался там. Это сведения предыдущей проверки. В текущем запуске VM выключены; доступность сервера и агентов не подтверждалась. Новая CI VM не создаётся.")
p("После запуска VM требуется подтвердить адрес STAGE, SSH User и fingerprint, hostname, каталог и Compose project, размещение PostgreSQL и точное имя тома. Затем нужны Verify feature, независимое Approved, merge в dev, Verify dev, ручные Publish/Stage, проверка HTTP и SQL до/после, реальный сценарий rollback.")
p("Подробности и воспроизводимые команды: docs/LAB5_STEPS_RU.md и docs/LAB5_LOCAL_VALIDATION_RU.md.")

page()
evidence(1, "TeamCity и агент TEST", "После запуска VM показать действующий Server на TEST, подключённый jetbrains/teamcity-agent и фактические имена/состояние агентов.")
evidence(2, "Успешная сборка feature", "Вставить настоящую Verify feature/lab5-zero-stock с итоговым SUCCESS, номером сборки и SHA проверенного коммита.")
page()
evidence(3, "Независимое согласование PR", "Показать PR №2 в dev и реальное Approved другого участника. Самоодобрение не подтверждает выполнение задания.")
evidence(4, "Merge и успешная сборка dev", "После согласования показать merge commit PR №2 и успешную Verify dev с соответствующим SHA. PR пока не объединён.")
page()
evidence(5, "Docker Hub и проверенные образы", "Показать ручной Publish, release.env, digest runner/migrator и соответствие SHA успешной Verify. Секреты на снимок не включать.")
evidence(6, "Доставка на STAGE", "Показать ручной Stage SUCCESS и фактические контейнеры STAGE после доставки. Зафиксировать app digest и readiness снаружи приложения.")
page()
evidence(7, "Нулевой остаток на STAGE", "Показать новый фильтр в работающем интерфейсе STAGE, включая материал с нулевым остатком и нулевым минимумом.")
evidence(8, "PostgreSQL и проверка rollback", "Вставить настоящие результаты: прежний контейнер/том БД, контрольная SQL-запись до и после, а также лог проверки rollback на учебном STAGE.")

def footer(canvas, doc):
    canvas.setFillColor(colors.black)
    canvas.setFont("Report", 10)
    canvas.drawCentredString(A4[0]/2, 12*mm, str(doc.page))

doc = SimpleDocTemplate(str(OUT / "StockFlow_Lab5_Draft.pdf"), pagesize=A4, rightMargin=15*mm, leftMargin=30*mm, topMargin=20*mm, bottomMargin=20*mm, title="StockFlow Лабораторная работа 5 Непрерывная доставка", author="Остапенко В. Р.")
doc.build(story, onFirstPage=footer, onLaterPages=footer)
(OUT / "StockFlow_Lab5_Draft.md").write_text("\n".join(source), encoding="utf-8")
print("Created draft PDF and editable Markdown source")
