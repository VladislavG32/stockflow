import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";

// РџСЂРѕРІРµСЂРєР° С‡РµСЂРµР· РЅР°СЃС‚РѕСЏС‰РёР№ HTTP Рё PostgreSQL, Р±РµР· РјРѕРєРѕРІ. РЈРґР°Р»СЏРµС‚ С‚РѕР»СЊРєРѕ СЃРѕР·РґР°РЅРЅС‹Рµ РµСЋ Р·Р°РїРёСЃРё.
// BASE_URL РґРѕР»Р¶РµРЅ СѓРєР°Р·С‹РІР°С‚СЊ РЅР° РїСЂРёР»РѕР¶РµРЅРёРµ, РїРѕРґРєР»СЋС‡С‘РЅРЅРѕРµ Рє С‚РѕР№ Р¶Рµ DATABASE_URL.
const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3000";
// Р”РѕРїСѓСЃРє С‚РѕР»СЊРєРѕ Рє СЃРїРµС†РёР°Р»СЊРЅРѕ РЅР°Р·РІР°РЅРЅРѕР№ РѕРґРЅРѕСЂР°Р·РѕРІРѕР№ Р‘Р”. РџСЂРѕРІРµСЂРєР° Р”Рћ Р»СЋР±С‹С… Р·Р°РїСЂРѕСЃРѕРІ.
// РќР° СЂР°Р±РѕС‡РёС… TEST/STAGE/PROD СЌС‚РѕС‚ СЃС†РµРЅР°СЂРёР№ Р·Р°РїСѓСЃРєР°С‚СЊ РЅРµР»СЊР·СЏ, РґР°Р¶Рµ РґР»СЏ QA-Р·Р°РїРёСЃРµР№.
if (!process.env.DATABASE_URL || process.env.STOCKFLOW_TEST_DATABASE !== "stockflow_ci" ||
    new URL(process.env.DATABASE_URL).pathname !== "/stockflow_ci") {
  throw new Error("Р Р°Р·СЂРµС€РµРЅР° С‚РѕР»СЊРєРѕ РѕС‚РґРµР»СЊРЅР°СЏ stockflow_ci СЃ STOCKFLOW_TEST_DATABASE=stockflow_ci");
}
const code = `QA-${randomUUID().slice(0, 12).toUpperCase()}`;
const supplierName = `${code}-РџРѕСЃС‚Р°РІС‰РёРє`;
const receiptNumbers: string[] = [];
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
async function request(
  path: string,
  body?: unknown,
  method = "POST",
  status = 201,
) {
  const response = await fetch(
    `${baseUrl}${path}`,
    body === undefined
      ? undefined
      : {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
  );
  const result = await response.json();
  assert.equal(response.status, status, `${path}: ${JSON.stringify(result)}`);
  return result;
}

async function main() {
  if (!process.env.DATABASE_URL)
    throw new Error("DATABASE_URL is required for cleanup");
  assert.deepEqual(await request("/api/health", undefined, "GET", 200), {
    status: "ok",
    service: "stockflow",
  });
  await request("/api/ready", undefined, "GET", 200);
  const material = {
    code,
    name: `=РўРµСЃС‚ ${code}`,
    category: "QA",
    unit: "С€С‚.",
    minimumStock: 10,
    targetStock: 20,
  };
  const { id: materialId } = await request("/api/materials", material);
  const { id: supplierId } = await request("/api/suppliers", {
    name: supplierName,
  });
  // РџСЂРѕРІРµСЂСЏРµРј, С‡С‚Рѕ РїСЂРёР»РѕР¶РµРЅРёРµ Рё cleanup РїРѕРґРєР»СЋС‡РµРЅС‹ Рє РѕРґРЅРѕР№ Р±Р°Р·Рµ, РґРѕ Р»СЋР±С‹С… СѓРґР°Р»РµРЅРёР№.
  const stored = await pool.query("select id from materials where code = $1", [
    code,
  ]);
  assert.equal(
    stored.rows[0]?.id,
    materialId,
    "BASE_URL Рё DATABASE_URL РґРѕР»Р¶РЅС‹ РѕС‚РЅРѕСЃРёС‚СЊСЃСЏ Рє РѕРґРЅРѕР№ Р‘Р”",
  );
  await request("/api/materials", material, "POST", 409);
  await request("/api/suppliers", { name: supplierName }, "POST", 409);
  await request(
    "/api/materials",
    { ...material, code: `${code}-BAD`, targetStock: 1 },
    "POST",
    400,
  );
  async function current() {
    const data = await request("/api/dashboard", undefined, "GET", 200);
    return data.materials.find(
      (item: { id: number }) => item.id === materialId,
    );
  }
  assert.equal((await current()).balance, 0);
  assert.equal((await current()).recommended, 20);
  const makeReceipt = (number: string, quantity: number) => ({
    number,
    materialId,
    supplierId,
    quantity,
    receivedOn: "2026-10-18",
  });
  const first = `${code}-R1`;
  receiptNumbers.push(first);
  await request("/api/receipts", { ...makeReceipt(first, 5), unitPriceKopecks: 12345 });
  const priced = await request("/api/dashboard", undefined, "GET", 200);
  assert.equal(priced.receipts.find((r: { number: string }) => r.number === first).totalKopecks, 61725);
  // Повтор номера не должен менять ни количество, ни цену исходной операции.
  await request("/api/receipts", { ...makeReceipt(first, 5), unitPriceKopecks: 1 }, "POST", 409);
  assert.equal((await current()).recommended, 15);
  await request("/api/receipts", makeReceipt(first, 5), "POST", 409);
  await request("/api/receipts", makeReceipt(`${code}-BAD`, -1), "POST", 400);
  await request(
    "/api/receipts",
    { ...makeReceipt(`${code}-BAD`, 1), receivedOn: "2026-02-30" },
    "POST",
    400,
  );
  await request(
    "/api/receipts",
    { ...makeReceipt(`${code}-BAD`, 1), supplierId: 2147483647 },
    "POST",
    400,
  );
  const csv = await fetch(`${baseUrl}/api/replenishment/export`);
  assert.equal(csv.status, 200);
  assert.match(await csv.text(), new RegExp(`'=РўРµСЃС‚ ${code}`));
  const second = `${code}-R2`;
  receiptNumbers.push(second);
  await request("/api/receipts", makeReceipt(second, 5));
  assert.equal((await current()).balance, 10);
  assert.equal(
    (await current()).recommended,
    0,
    "РќР° РјРёРЅРёРјСѓРјРµ Р·Р°РєСѓРїРєР° РЅРµ С‚СЂРµР±СѓРµС‚СЃСЏ",
  );
  await request(
    `/api/materials/${materialId}`,
    { minimumStock: 15, targetStock: 30 },
    "PATCH",
    200,
  );
  assert.equal((await current()).recommended, 20);
  await request(
    `/api/materials/${materialId}`,
    { minimumStock: 30, targetStock: 15 },
    "PATCH",
    400,
  );
  // РћРґРЅРѕРІСЂРµРјРµРЅРЅС‹Рµ РїРѕСЃС‚СѓРїР»РµРЅРёСЏ РЅРµ РґРѕР»Р¶РЅС‹ С‚РµСЂСЏС‚СЊ РѕР±РЅРѕРІР»РµРЅРёСЏ РѕСЃС‚Р°С‚РєР°.
  await Promise.all(
    Array.from({ length: 4 }, async (_, index) => {
      const number = `${code}-C${index}`;
      receiptNumbers.push(number);
      await request("/api/receipts", makeReceipt(number, 2));
    }),
  );
  assert.equal((await current()).balance, 18);
  assert.equal((await current()).recommended, 0);
  const wrongOrigin = await fetch(`${baseUrl}/api/materials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://example.org",
    },
    body: JSON.stringify(material),
  });
  assert.equal(wrongOrigin.status, 403);
  const badJson = await fetch(`${baseUrl}/api/materials`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{",
  });
  assert.equal(badJson.status, 400);
  const bigJson = await fetch(`${baseUrl}/api/materials`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "x".repeat(17000) }),
  });
  assert.equal(bigJson.status, 413);
  console.log(
    "PASS: PostgreSQL, СЃРїСЂР°РІРѕС‡РЅРёРєРё, РїРѕСЃС‚СѓРїР»РµРЅРёСЏ, РѕС€РёР±РєРё, РїР°СЂР°Р»Р»РµР»СЊРЅС‹Рµ РѕРїРµСЂР°С†РёРё, РїРѕРїРѕР»РЅРµРЅРёРµ Рё CSV",
  );
}

main()
  .catch((error) => {
    console.error(
      error instanceof Error ? error.message : "Integration failed",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await pool.query("delete from receipts where number = any($1::text[])", [
        receiptNumbers,
      ]);
      await pool.query("delete from materials where code = $1", [code]);
      await pool.query("delete from suppliers where name = $1", [supplierName]);
    } finally {
      await pool.end();
    }
  });
