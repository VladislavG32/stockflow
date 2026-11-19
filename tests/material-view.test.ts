import assert from "node:assert/strict";
import { test } from "node:test";
import { materialView } from "../src/lib/material-view";
import { matchesStockFilter } from "../src/lib/inventory";
import type { Material } from "../src/lib/types";

const materials: Material[] = [
  { id: 1, code: "М-10", name: "Кабель", category: "Электрика", unit: "м", additionalUnits: ["рулон"], balance: 8, minimumStock: 10, targetStock: 30, shortage: true, recommended: 22 },
  { id: 2, code: "М-2", name: "Болт", category: "Крепёж", unit: "шт.", additionalUnits: [], balance: 0, minimumStock: 0, targetStock: 0, shortage: false, recommended: 0 },
  { id: 3, code: "М-1", name: "Анкер", category: "Крепёж", unit: "шт.", additionalUnits: [], balance: 10, minimumStock: 10, targetStock: 20, shortage: false, recommended: 0 },
];

test("Нулевой остаток независим от минимума и сочетается с поиском и сортировкой", () => {
  const rows = [...materials, { ...materials[0], id: 4, code: "М-20", balance: 0 }];
  assert.deepEqual(materialView(rows, "", "", "empty", "code").map(x => x.id), [2, 4]);
  assert.deepEqual(materialView(rows, " БОЛТ ", "Крепёж", "empty", "balance").map(x => x.id), [2]);
  assert.equal(materialView(rows, "кабель", "Крепёж", "empty", "name").length, 0);
  assert.deepEqual(materialView([], "", "", "empty", "name"), []);
  assert.deepEqual(rows.map(x => x.id), [1, 2, 3, 4]);
  for (const shortage of [true, false]) {
    assert.equal(matchesStockFilter(0, shortage, "empty"), true);
    for (const balance of [0.01, 1, -1]) assert.equal(matchesStockFilter(balance, shortage, "empty"), false);
    assert.equal(matchesStockFilter(0, shortage, "low"), shortage);
    assert.equal(matchesStockFilter(0, shortage, "normal"), !shortage);
    assert.equal(matchesStockFilter(0, shortage, ""), true);
  }
});

test("Поиск нормализует пробелы/регистр и сочетается с категорией и запасом", () => {
  assert.deepEqual(materialView(materials, "  КАБ  ", "Электрика", "low", "name").map(x => x.id), [1]);
  assert.equal(materialView(materials, "каб", "Крепёж", "", "name").length, 0);
  assert.equal(materialView(materials, "не найдено", "", "", "name").length, 0);
  assert.deepEqual(materialView(materials, "ШТ.", "", "normal", "name").map(x => x.id), [3, 2]);
  assert.deepEqual(materialView(materials, "РУЛОН", "", "", "name").map(x => x.id), [1]);
});

test("На нулевом минимуме отсутствие запаса не означает необходимость закупки", () => {
  assert.deepEqual(materialView(materials, "", "", "low", "name").map(x => x.id), [1]);
  assert.deepEqual(materialView(materials, "", "", "normal", "name").map(x => x.id), [3, 2]);
});

test("Сортировка по коду числовая, остаток по возрастанию, закупка по убыванию; снимок не меняется", () => {
  assert.deepEqual(materialView(materials, "", "", "", "code").map(x => x.id), [3, 2, 1]);
  assert.deepEqual(materialView(materials, "", "", "", "balance").map(x => x.id), [2, 1, 3]);
  assert.deepEqual(materialView(materials, "", "", "", "recommended").map(x => x.id), [1, 3, 2]);
  assert.deepEqual(materials.map(x => x.id), [1, 2, 3]);
});
