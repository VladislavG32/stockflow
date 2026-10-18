"use client";

import type { Material, Receipt, Supplier } from "@/lib/types";
import { Empty, Panel } from "./ui";
import { RecordForm } from "./record-form";

export function MaterialTable({
  rows,
  onSaved,
}: {
  rows: Material[];
  onSaved: () => Promise<void>;
}) {
  return (
    <Panel
      id="materials"
      title="Материалы"
      subtitle="Каталог и индивидуальные пороги пополнения"
    >
      {rows.length ? (
        <div className="table-scroll">
          <table>
            <caption className="sr-only">Каталог материалов</caption>
            <thead>
              <tr>
                <th scope="col">Материал</th>
                <th scope="col">Категория</th>
                <th scope="col">Минимум / цель</th>
                <th scope="col">Настройка</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.name}</strong>
                    <span className="item-code">
                      {item.code} · {item.unit}
                    </span>
                  </td>
                  <td>{item.category}</td>
                  <td>
                    {item.minimumStock} / {item.targetStock}
                  </td>
                  <td>
                    <details className="limits-editor">
                      <summary>Пороги</summary>
                      <RecordForm
                        key={`${item.minimumStock}-${item.targetStock}`}
                        compact
                        method="PATCH"
                        endpoint={`/api/materials/${item.id}`}
                        onSaved={onSaved}
                        fields={[
                          {
                            name: "minimumStock",
                            label: "Минимум",
                            type: "number",
                            min: 0,
                            max: 1000000,
                            defaultValue: item.minimumStock,
                          },
                          {
                            name: "targetStock",
                            label: "Цель",
                            type: "number",
                            min: 0,
                            max: 1000000,
                            defaultValue: item.targetStock,
                          },
                        ]}
                      />
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty>
          Материалы не найдены. Добавьте первый материал или измените фильтры.
        </Empty>
      )}
      <div className="panel-footer">
        Показано: {rows.length} · пороги можно изменить для каждого материала
      </div>
    </Panel>
  );
}

export function SupplierList({ rows }: { rows: Supplier[] }) {
  return (
    <Panel
      id="suppliers"
      title="Поставщики"
      subtitle="Справочник партнёров склада"
    >
      {rows.length ? (
        <ul className="supplier-list">
          {rows.map((item) => (
            <li key={item.id}>
              <span className="supplier-avatar">{item.name.slice(0, 1)}</span>
              <div>
                <strong>{item.name}</strong>
                <span>{item.contact || "Контакт не указан"}</span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <Empty>
          Поставщики не найдены. Добавьте партнёра или измените поиск.
        </Empty>
      )}
      <div className="panel-footer">Показано поставщиков: {rows.length}</div>
    </Panel>
  );
}

export function ReceiptTable({ rows }: { rows: Receipt[] }) {
  // Форматируем только для показа; в БД и расчётах остаются целые копейки.
  const money = (value: number | null) => value === null ? "Не указана" :
    new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }).format(value / 100);
  return (
    <Panel
      id="receipts"
      title="Поступления"
      subtitle="Журнал зарегистрированных операций"
    >
      {rows.length ? (
        <div className="table-scroll">
          <table>
            <caption className="sr-only">Журнал поступлений</caption>
            <thead>
              <tr>
                <th scope="col">Операция / дата</th>
                <th scope="col">Материал / поставщик</th>
                <th scope="col">Количество</th>
                <th scope="col">Цена / стоимость</th>
                <th scope="col">Примечание</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.number}</strong>
                    <span className="item-code">
                      {item.receivedOn.split("-").reverse().join(".")}
                    </span>
                  </td>
                  <td>
                    <strong>{item.materialName}</strong>
                    <span className="item-code">{item.supplierName}</span>
                  </td>
                  <td className="positive-quantity">
                    +{item.quantity} {item.unit}
                  </td>
                  <td>{money(item.unitPriceKopecks)} / {money(item.totalKopecks)}</td>
                  <td>{item.note || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty>Поступлений пока нет или они не соответствуют поиску.</Empty>
      )}
      <div className="panel-footer">
        Показано операций: {rows.length} · остатки учитывают все
        зарегистрированные поступления
      </div>
    </Panel>
  );
}

export function BalanceTable({ rows }: { rows: Material[] }) {
  return (
    <Panel
      id="balances"
      title="Остатки"
      subtitle="Рассчитаны из поступлений, без ручного ввода"
    >
      {rows.length ? (
        <ul className="balance-list">
          {rows.map((item) => (
            <li key={item.id}>
              <div className="balance-heading">
                <strong>{item.name}</strong>
                <span>
                  {item.balance.toLocaleString("ru-RU")}{" "}
                  <span>{item.unit}</span>
                </span>
              </div>
              <div className="stock-track" aria-hidden="true">
                <span
                  className={item.shortage ? "low-stock" : ""}
                  style={{
                    width: `${item.targetStock ? Math.min(100, (item.balance / item.targetStock) * 100) : item.balance ? 100 : 0}%`,
                  }}
                />
              </div>
              <div className="balance-meta">
                <span>
                  Минимум {item.minimumStock} · цель {item.targetStock}
                </span>
                <span className={item.shortage ? "warning-text" : ""}>
                  {item.shortage ? "Ниже минимума" : "В пределах нормы"}
                </span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <Empty>
          Нет материалов для отображения. Проверьте каталог и фильтры.
        </Empty>
      )}
      <div className="panel-footer">
        Шкала — доля целевого запаса · единицы разных материалов не суммируются
      </div>
    </Panel>
  );
}

export function ReplenishmentTable({ rows }: { rows: Material[] }) {
  return (
    <Panel
      id="replenishment"
      title="Умный план пополнения склада"
      subtitle="Прозрачный расчёт без внешних сервисов и ИИ"
      action={
        <a className="button secondary" href="/api/replenishment/export">
          Экспорт CSV ↓
        </a>
      }
    >
      <div className="plan-explanation">
        Если остаток ниже минимума, к закупке = целевой запас − остаток.
        Поступление автоматически меняет рекомендацию. CSV выгружает полный
        актуальный план независимо от фильтров.
      </div>
      {rows.length ? (
        <div className="table-scroll">
          <table>
            <caption className="sr-only">Материалы, требующие закупки</caption>
            <thead>
              <tr>
                <th scope="col">Материал</th>
                <th scope="col">Остаток</th>
                <th scope="col">Минимум</th>
                <th scope="col">Цель</th>
                <th scope="col">К закупке</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.name}</strong>
                    <span className="item-code">{item.code}</span>
                  </td>
                  <td>
                    {item.balance} {item.unit}
                  </td>
                  <td>{item.minimumStock}</td>
                  <td>{item.targetStock}</td>
                  <td>
                    <span className="purchase-pill">
                      +{item.recommended} {item.unit}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty>
          В текущей выборке нет материалов ниже минимума. Для нового материала
          задайте минимальный запас больше нуля.
        </Empty>
      )}
      <div className="panel-footer">
        Рекомендация не создаёт заказ поставщику. Фактическое пополнение
        регистрируется как поступление.
      </div>
    </Panel>
  );
}
