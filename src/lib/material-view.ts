import type { Material } from "./types";

export type MaterialSort = "name" | "code" | "balance" | "recommended";

// Возвращает новую коллекцию: фильтрация и сортировка не меняют снимок склада.
export function materialView(
  materials: Material[],
  query: string,
  category: string,
  stockFilter: string,
  sort: MaterialSort,
) {
  const search = query.trim().toLocaleLowerCase("ru-RU");
  return materials.filter((item) =>
    [item.name, item.code, item.category, item.unit].some((value) => value.toLocaleLowerCase("ru-RU").includes(search)) &&
    (!category || item.category === category) &&
    (!stockFilter || (stockFilter === "low" ? item.shortage : !item.shortage)),
  ).sort((a, b) => {
    const difference = sort === "balance" ? a.balance - b.balance
      : sort === "recommended" ? b.recommended - a.recommended
        : a[sort].localeCompare(b[sort], "ru", { numeric: true });
    return difference || a.name.localeCompare(b.name, "ru", { numeric: true }) || a.id - b.id;
  });
}
