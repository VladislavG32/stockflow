import assert from "node:assert/strict";
import { test } from "node:test";
import { replenishment, csvCell, receiptCostKopecks, formatKopecks, MAX_UNIT_PRICE_KOPECKS } from "../src/lib/inventory";
import { materialSchema, receiptSchema, supplierSchema } from "../src/lib/validation";

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
  assert.deepEqual(materialSchema.parse({ ...material, additionalUnits: [" ящик "] }).additionalUnits, ["ящик"]);
  for (const patch of [
    { targetStock: 9 },
    { minimumStock: -1 },
    { targetStock: 1.5 },
    { name: "  " },
    { targetStock: 1000001 },
    { minimumStock: "10" },
    { additionalUnits: ["ШТ."] },
  ]) {
    assert.equal(
      materialSchema.safeParse({ ...material, ...patch }).success,
      false,
    );
  }
});

test("Поставщик: нормализация реквизитов и отклонение неверного ИНН", () => {
  assert.deepEqual(supplierSchema.parse({ name: " Партнёр ", taxId: " 7701234567 " }), {
    name: "Партнёр", taxId: "7701234567", contact: "", legalAddress: "",
  });
  for (const input of [{ name: " " }, { name: "x".repeat(161) }, { name: "А", taxId: "123" }]) {
    assert.equal(supplierSchema.safeParse(input).success, false);
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

test("Цена поступления: необязательное целое число в диапазоне PostgreSQL integer", () => {
  assert.equal(receiptSchema.parse(receipt).unitPriceKopecks, null);
  for (const unitPriceKopecks of [null, 0, 995, MAX_UNIT_PRICE_KOPECKS]) {
    assert.equal(receiptSchema.parse({ ...receipt, unitPriceKopecks }).unitPriceKopecks, unitPriceKopecks);
  }
  for (const unitPriceKopecks of [-1, 1.25, "995", "", MAX_UNIT_PRICE_KOPECKS + 1, Infinity]) {
    assert.equal(receiptSchema.safeParse({ ...receipt, unitPriceKopecks }).success, false);
  }
});

test("Номер документа: необязательное поле, обрезка пробелов и предел длины", () => {
  assert.equal(receiptSchema.parse(receipt).documentReference, null);
  assert.equal(receiptSchema.parse({ ...receipt, documentReference: "   " }).documentReference, null);
  assert.equal(receiptSchema.parse({ ...receipt, documentReference: " УПД-42/2026 " }).documentReference, "УПД-42/2026");
  assert.equal(receiptSchema.safeParse({ ...receipt, documentReference: 42 }).success, false);
  assert.equal(receiptSchema.safeParse({ ...receipt, documentReference: "х".repeat(81) }).success, false);
});

test("Стоимость и вывод цены: NULL, ноль, копейки и максимальное произведение", () => {
  assert.equal(receiptCostKopecks(5, null), null);
  assert.equal(receiptCostKopecks(5, 0), 0);
  assert.equal(receiptCostKopecks(5, 995), 4975);
  assert.equal(receiptCostKopecks(1_000_000, MAX_UNIT_PRICE_KOPECKS), 2_147_483_647_000_000);
  assert.equal(formatKopecks(null), "Не указана");
  assert.equal(formatKopecks(0), "0,00 ₽");
  assert.equal(formatKopecks(4975), "49,75 ₽");
});

test("CSV: экранирование кавычек, разделителей, переносов и формул", () => {
  assert.equal(csvCell('А;"Б"\nВ'), '"А;""Б""\nВ"');
  assert.equal(csvCell("=1+1"), '"\'=1+1"');
  assert.equal(csvCell("  @SUM(1)"), '"\'  @SUM(1)"');
  assert.equal(csvCell(22), '"22"');
});
