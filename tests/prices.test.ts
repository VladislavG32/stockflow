import assert from "node:assert/strict";
import { test } from "node:test";
import { receiptCost } from "../src/lib/inventory";
import { receiptSchema } from "../src/lib/validation";

test("Цена: точные копейки, бесплатное и историческое поступление", () => {
  assert.equal(receiptCost(3, 12345), 37035);
  assert.equal(receiptCost(3, 0), 0);
  assert.equal(receiptCost(3, null), null);
  assert.equal(receiptCost(1000000, 1000000000), 1000000000000000);
});

test("Цена: старый API совместим, дробные и отрицательные копейки запрещены", () => {
  const input = { number: "PRICE", materialId: 1, supplierId: 1, quantity: 3, receivedOn: "2026-10-18" };
  assert.equal(receiptSchema.parse(input).unitPriceKopecks, null);
  for (const value of [-1, 1.5, "123", 1000000001]) {
    assert.equal(receiptSchema.safeParse({ ...input, unitPriceKopecks: value }).success, false);
  }
});
