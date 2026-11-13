"use client";

import type { DashboardData } from "@/lib/types";
import { RecordForm, type Field } from "./record-form";

const materialFields: Field[] = [
  { name: "code", label: "Код материала", maxLength: 40, placeholder: "Например, МАТ-001" },
  { name: "name", label: "Наименование", maxLength: 160, placeholder: "Например, Кабель ВВГ" },
  { name: "category", label: "Категория", maxLength: 100, placeholder: "Например, Электрика" },
  { name: "unit", label: "Единица измерения", maxLength: 20, placeholder: "шт., м, кг" },
  {
    name: "minimumStock",
    label: "Минимальный запас",
    type: "number",
    min: 0,
    max: 1000000,
    defaultValue: 0,
  },
  {
    name: "targetStock",
    label: "Целевой запас",
    type: "number",
    min: 0,
    max: 1000000,
    defaultValue: 0,
  },
];

// details раскрывает форму без отдельного окна; все поля доступны с клавиатуры.
export function InventoryForms({
  data,
  onSaved,
}: {
  data: DashboardData;
  onSaved: () => Promise<void>;
}) {
  return (
    <section className="entry-section" aria-labelledby="entry-title">
      <div className="data-label">
        <h2 id="entry-title">Работа со складом</h2>
        <span>Поля со * обязательны · количество — целое число</span>
      </div>
      <div className="entry-grid">
        <details className="entry-card">
          <summary>+ Новый материал</summary>
          <p>Задайте минимум и цель для автоматического плана закупок.</p>
          <RecordForm
            endpoint="/api/materials"
            fields={materialFields}
            onSaved={onSaved}
          />
        </details>
        <details className="entry-card">
          <summary>+ Новый поставщик</summary>
          <p>Добавьте партнёра перед регистрацией поставки.</p>
          <RecordForm
            endpoint="/api/suppliers"
            fields={[
              { name: "name", label: "Название", maxLength: 160 },
              {
                name: "contact",
                label: "Контактные данные",
                maxLength: 200,
                optional: true,
              },
            ]}
            onSaved={onSaved}
          />
        </details>
        <details className="entry-card">
          <summary>↓ Зарегистрировать поступление</summary>
          {data.materials.length && data.suppliers.length ? (
            <>
              <p>Поступление увеличит остаток и обновит план пополнения.</p>
              <RecordForm
                endpoint="/api/receipts"
                fields={[
                  {
                    name: "number",
                    label: "Уникальный номер операции",
                    maxLength: 40,
                  },
                  {
                    name: "materialId",
                    label: "Материал",
                    options: data.materials.map((item) => ({
                      value: item.id,
                      label: `${item.code} · ${item.name} (${item.unit})`,
                    })),
                  },
                  {
                    name: "supplierId",
                    label: "Поставщик",
                    options: data.suppliers.map((item) => ({
                      value: item.id,
                      label: item.name,
                    })),
                  },
                  {
                    name: "quantity",
                    label: "Количество",
                    type: "number",
                    min: 1,
                    max: 1000000,
                  },
                  {
                    name: "receivedOn",
                    label: "Дата поступления",
                    type: "date",
                    min: "2000-01-01",
                    max: "2100-12-31",
                  },
                  {
                    name: "note",
                    label: "Примечание",
                    maxLength: 500,
                    optional: true,
                  },
                ]}
                onSaved={onSaved}
              />
            </>
          ) : (
            <div className="receipt-help"><p>Для поступления нужны материал и поставщик. Добавьте их в формах рядом, затем вернитесь сюда.</p></div>
          )}
        </details>
      </div>
    </section>
  );
}
