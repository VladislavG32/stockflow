"use client";

import { useState } from "react";
import type { DashboardData } from "@/lib/types";
import { materialView, type MaterialSort } from "@/lib/material-view";
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
  const [sort, setSort] = useState<MaterialSort>("name");
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
  const visibleMaterials = materialView(data?.materials ?? [], query, category, stockFilter, sort);
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
          <p className="eyebrow">STOCKFLOW / РАБОЧЕЕ ПРОСТРАНСТВО</p>
          <h1>Обзор склада</h1>
          <p className="subtitle">Материалы, поступления и запасы — в одном месте</p>
        </div>
      </div>
      <div className="intro-banner">
        <div className="intro-icon">
          <BoxIcon />
        </div>
        <div>
          <strong>Всё о складе — в одном пространстве</strong>
          <p>
            Регистрируйте поступления и следите за остатками. План пополнения рассчитывается по вашим порогам.
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
            : "Общий снимок склада · обновляйте при работе в нескольких вкладках"}
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
            <h2>Данные склада</h2>
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
                <option value="normal">Не ниже минимума</option>
              </select>
            </label>
            <label>
              <span>Порядок материалов</span>
              <select value={sort} onChange={(event) => setSort(event.target.value as MaterialSort)}>
                <option value="name">По названию: А–Я</option>
                <option value="code">По коду: А–Я</option>
                <option value="balance">Остаток: по возрастанию</option>
                <option value="recommended">К закупке: по убыванию</option>
              </select>
            </label>
            <button
              className="button secondary"
              onClick={() => {
                setQuery("");
                setCategory("");
                setStockFilter("");
                setSort("name");
              }}
            >
              Сбросить
            </button>
          </div>
          <div className="filter-result" role="status">
            <span>Материалов: {visibleMaterials.length} из {data.materials.length} · поставщиков: {visibleSuppliers.length} · поступлений: {visibleReceipts.length}</span>
            <span>Категория и запас применяются к материалам, остаткам и плану</span>
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
