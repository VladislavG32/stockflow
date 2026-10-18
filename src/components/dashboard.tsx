"use client";

import { useState } from "react";
import { matchesStockFilter } from "@/lib/inventory";
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

// РџРѕСЃР»Рµ Р·Р°РїРёСЃРё РЅРѕРІС‹Р№ СЃРЅРёРјРѕРє РѕР±РЅРѕРІР»СЏРµС‚ РєР°С‚Р°Р»РѕРі, РѕСЃС‚Р°С‚РєРё Рё СЂРµРєРѕРјРµРЅРґР°С†РёРё РІРјРµСЃС‚Рµ.
export function Dashboard({
  initialData,
}: {
  initialData: DashboardData | null;
}) {
  const [data, setData] = useState(initialData);
  const [error, setError] = useState(
    initialData
      ? ""
      : "РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ СЃРєР»Р°Рґ. РџСЂРѕРІРµСЂСЊС‚Рµ PostgreSQL Рё РїСЂРёРјРµРЅРµРЅРёРµ РјРёРіСЂР°С†РёР№.",
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
        "РќРµ СѓРґР°Р»РѕСЃСЊ РѕР±РЅРѕРІРёС‚СЊ РґР°РЅРЅС‹Рµ. РџСЂРµРґС‹РґСѓС‰РёР№ СЃРЅРёРјРѕРє РјРѕР¶РµС‚ Р±С‹С‚СЊ СѓСЃС‚Р°СЂРµРІС€РёРј. РџСЂРѕРІРµСЂСЊС‚Рµ СЃРѕРµРґРёРЅРµРЅРёРµ Рё РЅР°Р¶РјРёС‚Рµ В«РћР±РЅРѕРІРёС‚СЊ РґР°РЅРЅС‹РµВ».",
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
        matchesStockFilter(item.balance, item.shortage, stockFilter),
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
          <p className="eyebrow">РџР РћРЎРўРћР™ РЈР§РЃРў. РџРћР›РќР«Р™ РћР‘Р—РћР .</p>
          <h1>StockFlow</h1>
          <p className="subtitle">РЎРёСЃС‚РµРјР° Р°РІС‚РѕРјР°С‚РёР·Р°С†РёРё СЃРєР»Р°РґСЃРєРѕРіРѕ СѓС‡С‘С‚Р°</p>
        </div>
        <span className="version-tag">Р›Р  в„–3 / 0.2</span>
      </div>
      <div className="intro-banner">
        <div className="intro-icon">
          <BoxIcon />
        </div>
        <div>
          <strong>Р’СЃС‘ Рѕ СЃРєР»Р°РґРµ вЂ” РІ РѕРґРЅРѕРј РїСЂРѕСЃС‚СЂР°РЅСЃС‚РІРµ</strong>
          <p>
            Р–РёРІС‹Рµ РґР°РЅРЅС‹Рµ, РїРѕРЅСЏС‚РЅС‹Рµ РѕРїРµСЂР°С†РёРё Рё РїР»Р°РЅ РїРѕРїРѕР»РЅРµРЅРёСЏ РґРѕ С†РµР»РµРІРѕРіРѕ
            Р·Р°РїР°СЃР°.
          </p>
        </div>
        <a href="#replenishment" className="banner-link">
          РџР»Р°РЅ РїРѕРїРѕР»РЅРµРЅРёСЏ в†—
        </a>
      </div>
      <div className="refresh-row">
        <span aria-live="polite">
          {updated
            ? `Р”Р°РЅРЅС‹Рµ РѕР±РЅРѕРІР»РµРЅС‹ РІ ${updated}`
            : "Р”Р°РЅРЅС‹Рµ РёР· PostgreSQL В· РѕР±РЅРѕРІР»СЏР№С‚Рµ РїСЂРё СЂР°Р±РѕС‚Рµ РІ РЅРµСЃРєРѕР»СЊРєРёС… РІРєР»Р°РґРєР°С…"}
        </span>
        <button
          className="button secondary"
          disabled={refreshing}
          onClick={() => void refresh().catch(() => {})}
        >
          {refreshing ? "РћР±РЅРѕРІР»РµРЅРёРµвЂ¦" : "РћР±РЅРѕРІРёС‚СЊ РґР°РЅРЅС‹Рµ"}
        </button>
      </div>
      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}
      {data && (
        <>
          <div className="summary-grid" aria-label="РџРѕРєР°Р·Р°С‚РµР»Рё РІСЃРµРіРѕ СЃРєР»Р°РґР°">
            {sections.map((section, index) => (
              <a
                className="summary-card"
                href={`#${section.id}`}
                key={section.id}
              >
                <div className="summary-top">
                  <span>{section.label}</span>
                  <span className="summary-arrow" aria-hidden="true">
                    в†—
                  </span>
                </div>
                <div className="summary-value">
                  {counts[index]}
                  <span>
                    {
                      [
                        "РІ РєР°С‚Р°Р»РѕРіРµ",
                        "РїР°СЂС‚РЅС‘СЂРѕРІ",
                        "РѕРїРµСЂР°С†РёР№",
                        "РїРѕР·РёС†РёР№ РІ РЅР°Р»РёС‡РёРё",
                      ][index]
                    }
                  </span>
                </div>
                <span className="summary-caption">
                  {
                    [
                      "РљР°С‚Р°Р»РѕРі РјР°С‚РµСЂРёР°Р»РѕРІ",
                      "РџР°СЂС‚РЅС‘СЂС‹ СЃРєР»Р°РґР°",
                      "Р–СѓСЂРЅР°Р» РїРѕСЃС‚СѓРїР»РµРЅРёР№",
                      "РџРѕР»РѕР¶РёС‚РµР»СЊРЅС‹Рµ РѕСЃС‚Р°С‚РєРё",
                    ][index]
                  }
                </span>
              </a>
            ))}
          </div>
          {shortageCount > 0 && (
            <a href="#replenishment" className="shortage-banner">
              <span>
                в†— РўСЂРµР±СѓСЋС‚ РїРѕРїРѕР»РЅРµРЅРёСЏ: <strong>{shortageCount}</strong>
              </span>
              <span>РћС‚РєСЂС‹С‚СЊ СЂРµРєРѕРјРµРЅРґР°С†РёРё в†’</span>
            </a>
          )}
          <InventoryForms data={data} onSaved={refresh} />
          <div className="data-label">
            <h2>РћР±Р·РѕСЂ СЃРєР»Р°РґР°</h2>
            <span>РџРѕРєР°Р·Р°С‚РµР»Рё РІС‹С€Рµ РѕС‚РЅРѕСЃСЏС‚СЃСЏ РєРѕ РІСЃРµРјСѓ СЃРєР»Р°РґСѓ</span>
          </div>
          <div className="filter-bar">
            <label className="search-field">
              <span>РџРѕРёСЃРє РїРѕ РІСЃРµРј СЂР°Р·РґРµР»Р°Рј</span>
              <input
                type="search"
                placeholder="РќР°Р·РІР°РЅРёРµ, РєРѕРґ, РїРѕСЃС‚Р°РІС‰РёРє, РЅРѕРјРµСЂ РѕРїРµСЂР°С†РёРёвЂ¦"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <label>
              <span>РљР°С‚РµРіРѕСЂРёСЏ РјР°С‚РµСЂРёР°Р»РѕРІ</span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option value="">Р’СЃРµ РєР°С‚РµРіРѕСЂРёРё</option>
                {[...new Set(data.materials.map((item) => item.category))]
                  .sort()
                  .map((value) => (
                    <option key={value}>{value}</option>
                  ))}
              </select>
            </label>
            <label>
              <span>Р—Р°РїР°СЃ РјР°С‚РµСЂРёР°Р»РѕРІ</span>
              <select
                value={stockFilter}
                onChange={(event) => setStockFilter(event.target.value)}
              >
                <option value="">Р›СЋР±РѕР№ Р·Р°РїР°СЃ</option>
                <option value="low">РќРёР¶Рµ РјРёРЅРёРјСѓРјР°</option>
                <option value="normal">Р’ РїСЂРµРґРµР»Р°С… РЅРѕСЂРјС‹</option>
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
              РЎР±СЂРѕСЃРёС‚СЊ
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
