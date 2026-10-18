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
