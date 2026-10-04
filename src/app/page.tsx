import type { ReactNode } from "react";

const sections = [
  { id: "materials", label: "Материалы", mark: "01" },
  { id: "suppliers", label: "Поставщики", mark: "02" },
  { id: "receipts", label: "Поступления", mark: "03" },
  { id: "balances", label: "Остатки", mark: "04" },
];

const materials = [
  { code: "МТ-001", name: "Бумага офисная А4", category: "Канцелярия", quantity: 120, unit: "упак.", level: 80 },
  { code: "МТ-002", name: "Кабель сетевой UTP", category: "Комплектующие", quantity: 350, unit: "м", level: 65 },
  { code: "МТ-003", name: "Картридж лазерный", category: "Расходные материалы", quantity: 8, unit: "шт.", level: 20 },
];

function BoxIcon({ small = false }: { small?: boolean }) {
  return (
    <svg width={small ? 22 : 28} height={small ? 22 : 28} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Zm0 0v9m8-4.5L12 12 4 7.5M12 12v9" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function Panel({ id, title, subtitle, children }: { id: string; title: string; subtitle: string; children: ReactNode }) {
  return (
    <section id={id} className="panel" aria-labelledby={`${id}-title`}>
      <div className="panel-heading">
        <div><h2 id={`${id}-title`}>{title}</h2><p>{subtitle}</p></div>
        <span className="panel-dot" aria-hidden="true" />
      </div>
      {children}
    </section>
  );
}

export default function Home() {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">Перейти к содержимому</a>
      <aside className="sidebar">
        <a href="#main" className="brand"><span className="brand-icon"><BoxIcon /></span>StockFlow<span className="brand-point">.</span></a>
        <div className="workspace-label">РАБОЧЕЕ ПРОСТРАНСТВО</div>
        <nav aria-label="Разделы складского учёта">
          <a href="#main" className="overview-link"><span aria-hidden="true">▦</span> Обзор склада</a>
          {sections.map((section) => <a key={section.id} href={`#${section.id}`}><span className="nav-number">{section.mark}</span>{section.label}</a>)}
        </nav>
        <div className="sidebar-note"><span className="note-symbol" aria-hidden="true">↗</span><strong>От идеи к системе</strong><p>Учебный проект<br />Московского Политеха</p><span className="lab-chip">Лабораторная №2</span></div>
        <div className="sidebar-footer"><span className="avatar" aria-hidden="true">СФ</span><div><strong>Учебное пространство</strong><span>Версия 0.1.0</span></div></div>
      </aside>

      <div className="content-shell">
        <header className="topbar"><span>Рабочее пространство <span className="breadcrumb-slash">/</span> <strong>Обзор</strong></span><span className="prototype-badge"><span aria-hidden="true" />Учебный прототип</span></header>
        <main id="main">
          <div className="page-heading"><div><p className="eyebrow">ПРОСТОЙ УЧЁТ. ПОЛНЫЙ ОБЗОР.</p><h1>StockFlow</h1><p className="subtitle">Система автоматизации складского учёта</p></div><span className="version-tag">ПРОТОТИП / 0.1</span></div>

          <div className="intro-banner"><div className="intro-icon"><BoxIcon /></div><div><strong>Всё о складе — в одном пространстве</strong><p>Материалы, поставщики и движение запасов. Основа для будущей системы.</p></div><span className="banner-decoration" aria-hidden="true">↗</span></div>

          <div className="summary-grid" aria-label="Обзор демонстрационных данных">
            {sections.map((section, index) => <a className="summary-card" href={`#${section.id}`} key={section.id}><div className="summary-top"><span>{section.label}</span><span className="summary-arrow" aria-hidden="true">↗</span></div><div className="summary-value">{["3", "2", "2", "3"][index]}<span>{["позиции", "компании", "поставки", "позиции на складе"][index]}</span></div><span className="summary-caption">{["Каталог материалов", "Партнёры склада", "Последние поступления", "Текущие запасы"][index]}</span></a>)}
          </div>

          <div className="data-label"><h2>Обзор склада</h2><span><span className="demo-dot" aria-hidden="true" />Демонстрационные данные</span></div>
          <div className="panels-grid">
            <Panel id="materials" title="Материалы" subtitle="Номенклатура складского учёта">
              <div className="table-scroll"><table><caption className="sr-only">Демонстрационный каталог материалов</caption><thead><tr><th scope="col">Наименование</th><th scope="col">Категория</th><th scope="col">Ед. изм.</th></tr></thead><tbody>{materials.map((material) => <tr key={material.code}><td><strong>{material.name}</strong><span className="item-code">{material.code}</span></td><td>{material.category}</td><td>{material.unit}</td></tr>)}</tbody></table></div>
              <div className="panel-footer">3 позиции в демонстрационном каталоге</div>
            </Panel>
            <Panel id="suppliers" title="Поставщики" subtitle="Партнёры и источники поставок">
              <ul className="supplier-list"><li><span className="supplier-avatar">О</span><div><strong>ОфисСнаб</strong><span>Канцелярия и расходные материалы</span></div><span className="supplier-state">Демо</span></li><li><span className="supplier-avatar blue">Т</span><div><strong>ТехноКомплект</strong><span>Кабели и комплектующие</span></div><span className="supplier-state">Демо</span></li></ul>
              <div className="panel-footer">2 условных поставщика</div>
            </Panel>
            <Panel id="receipts" title="Поступления" subtitle="Последние демонстрационные поставки">
              <ul className="receipt-list"><li><span className="receipt-icon" aria-hidden="true">↓</span><div><strong>Бумага офисная А4</strong><span>ОфисСнаб · ПР-002</span></div><div className="receipt-amount"><strong>+40 <span>упак.</span></strong><span>02.10.2026</span></div></li><li><span className="receipt-icon" aria-hidden="true">↓</span><div><strong>Кабель сетевой UTP</strong><span>ТехноКомплект · ПР-001</span></div><div className="receipt-amount"><strong>+150 <span>м</span></strong><span>01.10.2026</span></div></li></ul>
              <div className="panel-footer">Пример журнала поступлений</div>
            </Panel>
            <Panel id="balances" title="Остатки" subtitle="Наличие материалов на складе">
              <ul className="balance-list">{materials.map((material) => <li key={material.code}><div className="balance-heading"><strong>{material.name}</strong><span>{material.quantity} <span>{material.unit}</span></span></div><div className="stock-track" aria-hidden="true"><span className={material.level < 30 ? "low-stock" : ""} style={{ width: `${material.level}%` }} /></div></li>)}</ul>
              <div className="panel-footer">Полосы показывают условный уровень запаса</div>
            </Panel>
          </div>
          <div className="learning-note"><span aria-hidden="true">ⓘ</span><p>Учебный прототип для лабораторной работы №2 «Виртуализация». Данные приведены для примера; редактирование и сохранение будут добавлены в следующих работах.</p></div>
          <footer className="page-footer"><span>Московский Политех · StockFlow</span><a href="/api/health">Проверка состояния API <span aria-hidden="true">↗</span></a></footer>
        </main>
      </div>
    </div>
  );
}
