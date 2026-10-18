import type { ReactNode } from "react";

export const sections = [
  { id: "materials", label: "Материалы", mark: "01" },
  { id: "suppliers", label: "Поставщики", mark: "02" },
  { id: "receipts", label: "Поступления", mark: "03" },
  { id: "balances", label: "Остатки", mark: "04" },
];

export function BoxIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Zm0 0v9m8-4.5L12 12 4 7.5M12 12v9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Общая оболочка сохраняет стиль ЛР №2. Содержимое передаётся как children, без дублирования меню.
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Перейти к содержимому
      </a>
      <aside className="sidebar">
        <a href="#main" className="brand">
          <span className="brand-icon">
            <BoxIcon />
          </span>
          StockFlow<span className="brand-point">.</span>
        </a>
        <div className="workspace-label">РАБОЧЕЕ ПРОСТРАНСТВО</div>
        <nav aria-label="Разделы складского учёта">
          <a href="#main" className="overview-link">
            <span aria-hidden="true">▦</span>Обзор склада
          </a>
          {sections.map((section) => (
            <a key={section.id} href={`#${section.id}`}>
              <span className="nav-number">{section.mark}</span>
              {section.label}
            </a>
          ))}
          <a href="#replenishment">
            <span className="nav-number">05</span>План пополнения
          </a>
        </nav>
        <div className="sidebar-note">
          <span className="note-symbol" aria-hidden="true">
            ↗
          </span>
          <strong>От идеи к системе</strong>
          <p>
            Учебный проект
            <br />
            Московского Политеха
          </p>
          <span className="lab-chip">ЛР №3 · Контейнеризация</span>
        </div>
        <div className="sidebar-footer">
          <span className="avatar" aria-hidden="true">
            СФ
          </span>
          <div>
            <strong>Учебное пространство</strong>
            <span>Версия 0.2.0</span>
          </div>
        </div>
      </aside>
      <div className="content-shell">
        <header className="topbar">
          <span>
            Рабочее пространство <span className="breadcrumb-slash">/</span>
            <strong>Обзор</strong>
          </span>
          <span className="prototype-badge">
            <span aria-hidden="true" />
            Учебный прототип
          </span>
        </header>
        <main id="main">
          {children}
          <div className="learning-note">
            <span aria-hidden="true">ⓘ</span>
            <p>
              Развитие проекта для ЛР №3. Данные сохраняются в PostgreSQL.
              Версия ЛР №2 остаётся в истории Git: 1fbdd2b.
            </p>
          </div>
          <footer className="page-footer">
            <span>Московский Политех · StockFlow</span>
            <div className="footer-links">
              <a href="/api/health">Состояние приложения ↗</a>
              <a href="/api/ready">Готовность базы ↗</a>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}

export function Panel({
  id,
  title,
  subtitle,
  action,
  children,
}: {
  id: string;
  title: string;
  subtitle: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="panel" aria-labelledby={`${id}-title`}>
      <div className="panel-heading">
        <div>
          <h2 id={`${id}-title`}>{title}</h2>
          <p>{subtitle}</p>
        </div>
        {action ?? <span className="panel-dot" aria-hidden="true" />}
      </div>
      {children}
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty-state">{children}</p>;
}
