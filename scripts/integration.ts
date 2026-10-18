import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";

// Проверка через настоящий HTTP и PostgreSQL, без моков. Удаляет только созданные ею записи.
// BASE_URL должен указывать на приложение, подключённое к той же DATABASE_URL.
const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3000";
// Допуск только к специально названной одноразовой БД. Проверка ДО любых запросов.
// На рабочих TEST/STAGE/PROD этот сценарий запускать нельзя, даже для QA-записей.
if (!process.env.DATABASE_URL || process.env.STOCKFLOW_TEST_DATABASE !== "stockflow_ci" ||
    new URL(process.env.DATABASE_URL).pathname !== "/stockflow_ci") {
  throw new Error("Разрешена только отдельная stockflow_ci с STOCKFLOW_TEST_DATABASE=stockflow_ci");
}
const code = `QA-${randomUUID().slice(0, 12).toUpperCase()}`;
const supplierName = `${code}-Поставщик`;
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
    name: `=Тест ${code}`,
    category: "QA",
    unit: "шт.",
    minimumStock: 10,
    targetStock: 20,
  };
  const { id: materialId } = await request("/api/materials", material);
  const { id: supplierId } = await request("/api/suppliers", {
    name: supplierName,
  });
  // Проверяем, что приложение и cleanup подключены к одной базе, до любых удалений.
  const stored = await pool.query("select id from materials where code = $1", [
    code,
  ]);
  assert.equal(
    stored.rows[0]?.id,
    materialId,
    "BASE_URL и DATABASE_URL должны относиться к одной БД",
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
  await request("/api/receipts", makeReceipt(first, 5));
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
  assert.match(await csv.text(), new RegExp(`'=Тест ${code}`));
  const second = `${code}-R2`;
  receiptNumbers.push(second);
  await request("/api/receipts", makeReceipt(second, 5));
  assert.equal((await current()).balance, 10);
  assert.equal(
    (await current()).recommended,
    0,
    "На минимуме закупка не требуется",
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
  // Одновременные поступления не должны терять обновления остатка.
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
    "PASS: PostgreSQL, справочники, поступления, ошибки, параллельные операции, пополнение и CSV",
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
