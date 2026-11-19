export const navigation = [
  { id: "main", label: "Обзор склада" },
  { id: "materials", label: "Материалы" },
  { id: "suppliers", label: "Поставщики" },
  { id: "receipts", label: "Поступления" },
  { id: "balances", label: "Остатки" },
  { id: "replenishment", label: "План пополнения" },
] as const;

// Координаты относительно viewport. URL хранит цель перехода, а не текущую позицию.
export function activeSection(
  positions: { id: string; top: number }[],
  activationLine: number,
  atBottom: boolean,
) {
  if (atBottom && positions.length) return positions[positions.length - 1].id;
  return positions.filter((section) => section.top <= activationLine).at(-1)?.id ?? "main";
}
