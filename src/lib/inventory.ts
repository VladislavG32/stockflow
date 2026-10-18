// Р§РёСЃС‚Р°СЏ С„СѓРЅРєС†РёСЏ РЅРµ РѕР±СЂР°С‰Р°РµС‚СЃСЏ Рє Р‘Р” Рё РїСЂРѕРІРµСЂСЏРµС‚СЃСЏ РѕС‚РґРµР»СЊРЅРѕ РѕС‚ РёРЅС‚РµСЂС„РµР№СЃР°.
// Р—Р°РєСѓРїРєР° РЅСѓР¶РЅР° С‚РѕР»СЊРєРѕ РїСЂРё РѕСЃС‚Р°С‚РєРµ РЎРўР РћР“Рћ РЅРёР¶Рµ РјРёРЅРёРјСѓРјР°; РїРѕРїРѕР»РЅСЏРµРј РґРѕ С†РµР»Рё.
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

// Р—Р°С‰РёС‚Р° РѕС‚ С„РѕСЂРјСѓР» РїСЂРё РѕС‚РєСЂС‹С‚РёРё CSV РІ Excel. РљР°РІС‹С‡РєРё Рё СЂР°Р·РґРµР»РёС‚РµР»Рё СЌРєСЂР°РЅРёСЂСѓСЋС‚СЃСЏ РѕС‚РґРµР»СЊРЅРѕ.
export function csvCell(value: string | number) {
  const text = String(value);
  const safe = /^[\s]*[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
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

/** Стоимость поступления в копейках. Вход уже проверен receiptSchema.
 * При лимитах 10^6 единиц и 10^9 копеек произведение <= 10^15: это точное
 * целое JavaScript. NULL не включается в денежные итоги как бесплатный товар.
 */
export function receiptCost(quantity: number, unitPriceKopecks: number | null) {
  return unitPriceKopecks === null ? null : quantity * unitPriceKopecks;
}
