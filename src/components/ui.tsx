"use client";

import { useEffect, useState, type ReactNode } from "react";

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

const iconPaths: Record<string, string> = {
  main: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  materials: "m12 3 9 5-9 5-9-5 9-5z M3 8v9l9 5 9-5V8 M12 13v9",
  suppliers: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M17 4a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87",
  receipts: "M12 3v12 m-5-5 5 5 5-5 M4 16v5h16v-5",
  balances: "M4 21V11h4v10 M10 21V3h4v18 M16 21v-7h4v7",
  replenishment: "M3 17 9 11l4 4 8-10 M15 5h6v6",
};

export function SectionIcon({ id }: { id: string }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={iconPaths[id] ?? iconPaths.main} /></svg>;
}

export function AppShell({ children }: { children: ReactNode }) {
  const [active, setActive] = useState("main");
  useEffect(() => {
    const update = () => setActive(window.location.hash.slice(1) || "main");
    update();
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  const navigation = [{ id: "main", label: "Обзор склада" }, ...sections, { id: "replenishment", label: "План пополнения" }];
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
          {navigation.map((section) => (
            <a key={section.id} href={`#${section.id}`} aria-current={active === section.id ? "location" : undefined}>
              <SectionIcon id={section.id} />
              {section.label}
            </a>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="note-symbol" aria-hidden="true">
            ↗
          </span>
          <strong>Запасы под контролем</strong>
          <p>Задайте минимум и цель — StockFlow рассчитает, что нужно пополнить.</p>
          <a className="sidebar-plan" href="#replenishment">Перейти к плану →</a>
        </div>
        <div className="sidebar-footer">
          <span className="avatar" aria-hidden="true">
            СФ
          </span>
          <div>
            <strong>Складской учёт</strong>
            <span>Материалы и поставки</span>
          </div>
        </div>
      </aside>
      <div className="content-shell">
        <header className="topbar">
          <span>
            StockFlow <span className="breadcrumb-slash">/</span>
            <strong>{navigation.find((item) => item.id === active)?.label ?? "Обзор склада"}</strong>
          </span>
          <a className="topbar-action" href="#entry-title">+ Новая запись</a>
        </header>
        <main id="main" tabIndex={-1}>
          {children}
          <footer className="page-footer">
            <span>StockFlow · Складской учёт</span>
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
        {action}
      </div>
      {children}
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty-state">{children}</p>;
}
