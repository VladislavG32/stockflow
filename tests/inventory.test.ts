import assert from "node:assert/strict";
import { test } from "node:test";
import { replenishment, csvCell } from "../src/lib/inventory";
import { materialSchema, receiptSchema } from "../src/lib/validation";

test("Пополнение: недостаток, точная граница, избыток и нулевой минимум", () => {
  assert.deepEqual(replenishment(8, 10, 30), {
    shortage: true,
    recommended: 22,
  });
  assert.deepEqual(replenishment(10, 10, 30), {
    shortage: false,
    recommended: 0,
  });
  assert.deepEqual(replenishment(100, 10, 30), {
    shortage: false,
    recommended: 0,
  });
  assert.deepEqual(replenishment(0, 0, 0), { shortage: false, recommended: 0 });
  assert.deepEqual(replenishment(0, 10, 10), {
    shortage: true,
    recommended: 10,
  });
});

const material = {
  code: " x ",
  name: "Материал",
  category: "Тест",
  unit: "шт.",
  minimumStock: 10,
  targetStock: 20,
};
test("Материал: обрезка пробелов, нормализация кода, корректные пороги", () => {
  assert.equal(materialSchema.parse(material).code, "X");
  for (const patch of [
    { targetStock: 9 },
    { minimumStock: -1 },
    { targetStock: 1.5 },
    { name: "  " },
    { targetStock: 1000001 },
    { minimumStock: "10" },
  ]) {
    assert.equal(
      materialSchema.safeParse({ ...material, ...patch }).success,
      false,
    );
  }
});

const receipt = {
  number: "ПР-01",
  materialId: 1,
  supplierId: 1,
  quantity: 5,
  receivedOn: "2028-02-29",
};
test("Поступление: целое положительное количество и существующая календарная дата", () => {
  assert.equal(receiptSchema.safeParse(receipt).success, true);
  for (const patch of [
    { quantity: 0 },
    { quantity: -5 },
    { quantity: 1.2 },
    { quantity: 1000001 },
    { materialId: 0 },
    { receivedOn: "2026-02-29" },
    { receivedOn: "2026-04-31" },
    { receivedOn: "not-a-date" },
  ]) {
    assert.equal(
      receiptSchema.safeParse({ ...receipt, ...patch }).success,
      false,
    );
  }
});

test("CSV: экранирование кавычек, разделителей, переносов и формул", () => {
  assert.equal(csvCell('А;"Б"\nВ'), '"А;""Б""\nВ"');
  assert.equal(csvCell("=1+1"), '"\'=1+1"');
  assert.equal(csvCell("  @SUM(1)"), '"\'  @SUM(1)"');
  assert.equal(csvCell(22), '"22"');
});
