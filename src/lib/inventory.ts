// Чистая функция не обращается к БД и проверяется отдельно от интерфейса.
// Закупка нужна только при остатке СТРОГО ниже минимума; пополняем до цели.
export function replenishment(
  balance: number,
  minimumStock: number,
  targetStock: number,
) {
  const shortage = balance < minimumStock;
  return {
    shortage,
    recommended: shortage ? Math.max(0, targetStock - balance) : 0,
  };
}

// Защита от формул при открытии CSV в Excel. Кавычки и разделители экранируются отдельно.
export function csvCell(value: string | number) {
  const text = String(value);
  const safe = /^[\s]*[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

export const MAX_UNIT_PRICE_KOPECKS = 2_147_483_647;

// Максимальное количество 1 000 000: произведение двух допустимых значений
// укладывается в безопасный диапазон целых JavaScript.
export function receiptCostKopecks(quantity: number, unitPriceKopecks: number | null) {
  return unitPriceKopecks === null ? null : quantity * unitPriceKopecks;
}

export function formatKopecks(value: number | null) {
  if (value === null) return "Не указана";
  const rubles = Math.floor(value / 100).toLocaleString("ru-RU");
  return `${rubles},${String(value % 100).padStart(2, "0")} ₽`;
}

/** Фильтр ЛР5 помогает выделить пустые позиции из общего дефицита.
 * balance — остаток материала, shortage — результат расчёта дефицита.
 * Возвращает true для строки, которую нужно показать; пустой фильтр показывает всё.
 */
export function matchesStockFilter(balance: number, shortage: boolean, filter: string) {
  if (filter === "empty") return balance === 0;
  if (filter === "low") return shortage;
  if (filter === "normal") return !shortage;
  return true;
}
