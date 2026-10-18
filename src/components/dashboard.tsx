"use client";

import { useState } from "react";
import type { DashboardData } from "@/lib/types";
import { AppShell, BoxIcon, sections } from "./ui";
import { InventoryForms } from "./inventory-forms";
import {
  BalanceTable,
  MaterialTable,
  ReceiptTable,
  ReplenishmentTable,
  SupplierList,
} from "./inventory-tables";

// После записи новый снимок обновляет каталог, остатки и рекомендации вместе.
export function Dashboard({
  initialData,
}: {
  initialData: DashboardData | null;
}) {
  const [data, setData] = useState(initialData);
  const [error, setError] = useState(
    initialData
      ? ""
      : "Не удалось загрузить склад. Проверьте PostgreSQL и применение миграций.",
  );
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [stockFilter, setStockFilter] = useState("");
  const [updated, setUpdated] = useState("");

  async function refresh() {
    setRefreshing(true);
    try {
      const response = await fetch("/api/dashboard", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error("Refresh failed");
      setData(result);
      setError("");
      setUpdated(new Date().toLocaleTimeString("ru-RU"));
    } catch {
      setError(
        "Не удалось обновить данные. Предыдущий снимок может быть устаревшим. Проверьте соединение и нажмите «Обновить данные».",
      );
      throw new Error("Refresh failed");
    } finally {
      setRefreshing(false);
    }
  }

  const search = query.trim().toLocaleLowerCase("ru-RU");
  const matches = (...values: string[]) =>
    values.some((value) => value.toLocaleLowerCase("ru-RU").includes(search));
  const visibleMaterials =
    data?.materials.filter(
      (item) =>
        matches(item.name, item.code, item.category) &&
        (!category || item.category === category) &&
        (!stockFilter ||
          (stockFilter === "low" ? item.shortage : !item.shortage)),
    ) ?? [];
  const visibleSuppliers =
    data?.suppliers.filter((item) => matches(item.name, item.contact)) ?? [];
  const visibleReceipts =
    data?.receipts.filter((item) =>
      matches(item.number, item.materialName, item.supplierName, item.note),
    ) ?? [];
  const shortageCount =
    data?.materials.filter((item) => item.shortage).length ?? 0;
  const counts = data
    ? [
        data.materials.length,
        data.suppliers.length,
        data.receipts.length,
        data.materials.filter((item) => item.balance > 0).length,
      ]
    : [];

  return (
    <AppShell>
      <div className="page-heading">
        <div>
          <p className="eyebrow">ПРОСТОЙ УЧЁТ. ПОЛНЫЙ ОБЗОР.</p>
          <h1>StockFlow</h1>
          <p className="subtitle">Система автоматизации складского учёта</p>
        </div>
        <span className="version-tag">ЛР №3 / 0.2</span>
      </div>
      <div className="intro-banner">
        <div className="intro-icon">
          <BoxIcon />
        </div>
        <div>
          <strong>Всё о складе — в одном пространстве</strong>
          <p>
            Живые данные, понятные операции и план пополнения до целевого
            запаса.
          </p>
        </div>
        <a href="#replenishment" className="banner-link">
          План пополнения ↗
        </a>
      </div>
      <div className="refresh-row">
        <span aria-live="polite">
          {updated
            ? `Данные обновлены в ${updated}`
            : "Данные из PostgreSQL · обновляйте при работе в нескольких вкладках"}
        </span>
        <button
          className="button secondary"
          disabled={refreshing}
          onClick={() => void refresh().catch(() => {})}
        >
          {refreshing ? "Обновление…" : "Обновить данные"}
        </button>
      </div>
      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}
      {data && (
        <>
          <div className="summary-grid" aria-label="Показатели всего склада">
            {sections.map((section, index) => (
              <a
                className="summary-card"
                href={`#${section.id}`}
                key={section.id}
              >
                <div className="summary-top">
                  <span>{section.label}</span>
                  <span className="summary-arrow" aria-hidden="true">
                    ↗
                  </span>
                </div>
                <div className="summary-value">
                  {counts[index]}
                  <span>
                    {
                      [
                        "в каталоге",
                        "партнёров",
                        "операций",
                        "позиций в наличии",
                      ][index]
                    }
                  </span>
                </div>
                <span className="summary-caption">
                  {
                    [
                      "Каталог материалов",
                      "Партнёры склада",
                      "Журнал поступлений",
                      "Положительные остатки",
                    ][index]
                  }
                </span>
              </a>
            ))}
          </div>
          {shortageCount > 0 && (
            <a href="#replenishment" className="shortage-banner">
              <span>
                ↗ Требуют пополнения: <strong>{shortageCount}</strong>
              </span>
              <span>Открыть рекомендации →</span>
            </a>
          )}
          <InventoryForms data={data} onSaved={refresh} />
          <div className="data-label">
            <h2>Обзор склада</h2>
            <span>Показатели выше относятся ко всему складу</span>
          </div>
          <div className="filter-bar">
            <label className="search-field">
              <span>Поиск по всем разделам</span>
              <input
                type="search"
                placeholder="Название, код, поставщик, номер операции…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <label>
              <span>Категория материалов</span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option value="">Все категории</option>
                {[...new Set(data.materials.map((item) => item.category))]
                  .sort()
                  .map((value) => (
                    <option key={value}>{value}</option>
                  ))}
              </select>
            </label>
            <label>
              <span>Запас материалов</span>
              <select
                value={stockFilter}
                onChange={(event) => setStockFilter(event.target.value)}
              >
                <option value="">Любой запас</option>
                <option value="low">Ниже минимума</option>
                <option value="normal">В пределах нормы</option>
              </select>
            </label>
            <button
              className="button secondary"
              onClick={() => {
                setQuery("");
                setCategory("");
                setStockFilter("");
              }}
            >
              Сбросить
            </button>
          </div>
          <div className="panels-grid">
            <MaterialTable rows={visibleMaterials} onSaved={refresh} />
            <SupplierList rows={visibleSuppliers} />
            <ReceiptTable rows={visibleReceipts} />
            <BalanceTable rows={visibleMaterials} />
          </div>
          <div className="plan-section">
            <ReplenishmentTable
              rows={visibleMaterials.filter((item) => item.shortage)}
            />
          </div>
        </>
      )}
    </AppShell>
  );
}
