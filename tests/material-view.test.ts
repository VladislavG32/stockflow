import assert from "node:assert/strict";
import { test } from "node:test";
import { materialView } from "../src/lib/material-view";
import type { Material } from "../src/lib/types";

const materials: Material[] = [
  { id: 1, code: "М-10", name: "Кабель", category: "Электрика", unit: "м", balance: 8, minimumStock: 10, targetStock: 30, shortage: true, recommended: 22 },
  { id: 2, code: "М-2", name: "Болт", category: "Крепёж", unit: "шт.", balance: 0, minimumStock: 0, targetStock: 0, shortage: false, recommended: 0 },
  { id: 3, code: "М-1", name: "Анкер", category: "Крепёж", unit: "шт.", balance: 10, minimumStock: 10, targetStock: 20, shortage: false, recommended: 0 },
];

test("Поиск нормализует пробелы/регистр и сочетается с категорией и запасом", () => {
  assert.deepEqual(materialView(materials, "  КАБ  ", "Электрика", "low", "name").map(x => x.id), [1]);
  assert.equal(materialView(materials, "каб", "Крепёж", "", "name").length, 0);
  assert.equal(materialView(materials, "не найдено", "", "", "name").length, 0);
  assert.deepEqual(materialView(materials, "ШТ.", "", "normal", "name").map(x => x.id), [3, 2]);
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
