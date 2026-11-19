import assert from "node:assert/strict";

async function get(path) {
  const response = await fetch("http://127.0.0.1:3000/api/" + path, {
    signal: AbortSignal.timeout(8000),
  });
  assert.equal(response.status, 200, path);
  return response.json();
}

assert.deepEqual(await get("health"), { status: "ok", service: "stockflow" });
assert.deepEqual(await get("ready"), { status: "ok", service: "stockflow", database: "ok" });
const dashboard = await get("dashboard");
const receipts = await get("receipts");
const ids = new Set(dashboard.receipts.map(({ id }) => id));
assert.equal(ids.size, dashboard.receipts.length);
assert.deepEqual(receipts, dashboard.receipts);
for (const row of receipts) {
  assert.ok(row.documentReference === null || typeof row.documentReference === "string");
  assert.ok(row.unitPriceKopecks === null || (Number.isInteger(row.unitPriceKopecks) && row.unitPriceKopecks >= 0));
  assert.equal(row.totalCostKopecks, row.unitPriceKopecks === null ? null : row.unitPriceKopecks * row.quantity);
}
for (const material of dashboard.materials) {
  assert.equal(material.balance, receipts
    .filter(({ materialId }) => materialId === material.id)
    .reduce((sum, { quantity }) => sum + quantity, 0));
}
console.log(`HTTP 200: health, ready, dashboard, receipts. ${receipts.length} поступлений; цены, документы и остатки проверены.`);
