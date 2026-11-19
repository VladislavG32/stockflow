import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import pg from "pg";
import { materialSuppliers, receiptView } from "../src/lib/dashboard-view";
import { materialView } from "../src/lib/material-view";
import type { DashboardData } from "../src/lib/types";

const runId = process.env.CI_RUN_ID;
const connectionString = process.env.DATABASE_URL;
const databasePassword = process.env.CI_DB_PASSWORD;
assert.match(runId ?? "", /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/);
assert.match(databasePassword ?? "", /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/);
assert.ok(connectionString === `postgresql://stockflow_ci:${databasePassword}@db:5432/stockflow_ci`,
  "Integration requires the isolated Compose database");
const pool = new pg.Pool({ connectionString, connectionTimeoutMillis: 5000 });
const base = "http://app:3000";

async function verifyDatabase() {
  const { rows } = await pool.query(`
    select current_database() as db, current_user as role,
      current_setting('server_version_num')::int / 10000 as major,
      current_setting('stockflow.ci_run', true) as run
  `);
  assert.deepEqual(rows, [{ db: "stockflow_ci", role: "stockflow_ci", major: 17, run: runId }]);
}

async function request(path: string, status = 200, body?: unknown, method = "POST") {
  await verifyDatabase();
  const response = await fetch(`${base}${path}`, {
    ...(body === undefined ? {} : {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    signal: AbortSignal.timeout(15000),
  });
  const result = await response.json();
  assert.equal(response.status, status, `${method} ${path}: ${JSON.stringify(result)}`);
  return result;
}

async function dashboard(): Promise<DashboardData> {
  return request("/api/dashboard", 200, undefined, "GET");
}

const material = {
  code: "CI-1", name: "Кабель", category: "Электрика", unit: "м",
  additionalUnits: ["рулон"], minimumStock: 10, targetStock: 20,
};
const secondMaterial = { ...material, code: "CI-2", name: "Крепёж", unit: "шт.", additionalUnits: [] };
const supplier = {
  name: "Поставщик А", taxId: "7701234567", legalAddress: "Москва, ул. Складская, 1",
  contact: "qa@example.test",
};

before(verifyDatabase);
after(() => pool.end());

if (process.env.STOCKFLOW_INTEGRATION_PHASE === "persistence") {
  test("I09 Сохранность данных после пересоздания приложения", async () => {
    const { materials, receipts } = await dashboard();
    const item = materials.find(({ code }) => code === "CI-1");
    assert.ok(item);
    assert.equal(item.balance, 18);
    assert.equal(receipts.filter(({ materialId }) => materialId === item.id).length, 6);
  });
} else {
  let materialId: number;
  let otherId: number;
  let supplierId: number;
  let otherSupplierId: number;
  let unrelatedSupplierId: number;

  const receipt = (number: string, quantity = 5) => ({
    number, quantity, materialId, supplierId, receivedOn: "2026-10-18", note: "Ордер QA",
  });

  async function current() {
    const row = (await dashboard()).materials.find(({ id }) => id === materialId);
    assert.ok(row);
    return row;
  }

  test("I01 Готовность приложения с PostgreSQL 17", async () => {
    assert.deepEqual(await request("/api/health"), { status: "ok", service: "stockflow" });
    await request("/api/ready");
    assert.deepEqual(await dashboard(), { materials: [], suppliers: [], receipts: [] });
  });

  test("I02 Добавление, изменение и просмотр реквизитов материала", async () => {
    ({ id: materialId } = await request("/api/materials", 201, material));
    assert.deepEqual(await current(), {
      ...material, id: materialId, balance: 0, shortage: true, recommended: 20,
    });
    const edited = { ...material, code: "CI-EDIT", name: "Провод", category: "Группа 2",
      unit: "см", additionalUnits: ["бухта", "катушка"] };
    assert.deepEqual(await request(`/api/materials/${materialId}`, 200, edited, "PATCH"), { id: materialId });
    assert.deepEqual(await current(), {
      ...edited, id: materialId, balance: 0, shortage: true, recommended: 20,
    });
    await request(`/api/materials/${materialId}`, 200, material, "PATCH");
    ({ id: otherId } = await request("/api/materials", 201, secondMaterial));
    await request("/api/materials", 201, { ...material, code: "CI-EMPTY" });
  });

  test("I03 Поставщики и реквизиты в снимке склада", async () => {
    ({ id: supplierId } = await request("/api/suppliers", 201, supplier));
    ({ id: otherSupplierId } = await request("/api/suppliers", 201, { name: "Поставщик Б" }));
    ({ id: unrelatedSupplierId } = await request("/api/suppliers", 201, { name: "Поставщик В" }));
    assert.deepEqual((await dashboard()).suppliers.find(({ id }) => id === supplierId), { id: supplierId, ...supplier });
  });

  test("I04 Поступления, остаток и граница пополнения", async () => {
    const { id } = await request("/api/receipts", 201, receipt("CI-R1"));
    assert.equal((await current()).balance, 5);
    assert.equal((await current()).recommended, 15);
    assert.deepEqual((await dashboard()).receipts.find((row) => row.id === id), {
      ...receipt("CI-R1"), id, materialName: material.name, supplierName: supplier.name, unit: material.unit,
    });
    await request("/api/receipts", 201, receipt("CI-R2"));
    assert.equal((await current()).balance, 10);
    assert.equal((await current()).recommended, 0);
  });

  test("I05 Количество и список поставщиков выбранного материала", async () => {
    await request("/api/receipts", 201, { ...receipt("CI-R3", 2), supplierId: otherSupplierId });
    await request("/api/receipts", 201, {
      ...receipt("CI-OTHER"), materialId: otherId, supplierId: unrelatedSupplierId,
    });
    const { suppliers, receipts, materials } = await dashboard();
    const selected = materialSuppliers(suppliers, receipts, materialId);
    assert.equal(selected.length, 2);
    assert.deepEqual(selected.map(({ id }) => id), [supplierId, otherSupplierId]);
    assert.deepEqual(selected[0], { id: supplierId, ...supplier });
    assert.deepEqual(materialSuppliers(suppliers, receipts, otherId).map(({ id }) => id), [unrelatedSupplierId]);
    const empty = materials.find(({ code }) => code === "CI-EMPTY");
    assert.ok(empty);
    assert.deepEqual(materialSuppliers(suppliers, receipts, empty.id), []);
  });

  test("I06 Поиск и фильтры остатков и истории", async () => {
    const { materials, receipts } = await dashboard();
    const balances = materialView(materials, "  КАБ  ", "Электрика", "normal", "name");
    assert.deepEqual(balances.map(({ code, balance }) => [code, balance]), [["CI-1", 12]]);
    assert.deepEqual(materialView(materials, "рулон", "", "empty", "name").map(({ code }) => code), ["CI-EMPTY"]);
    assert.deepEqual(receiptView(receipts, "  qa ", materialId).map(({ number }) => number), ["CI-R3", "CI-R2", "CI-R1"]);
    assert.deepEqual(receiptView(receipts, "ci-r1", null).map(({ number }) => number), ["CI-R1"]);
    assert.deepEqual(receiptView(receipts, "ci-r1", otherId), []);
  });

  test("I07 Отклонение дубликатов, невалидного ввода и неверных связей", async () => {
    const original = await dashboard();
    await request("/api/materials", 409, material);
    await request("/api/materials", 400, { ...material, code: "CI-BAD", name: "" });
    await request("/api/suppliers", 409, supplier);
    await request("/api/receipts", 409, receipt("CI-R1"));
    await request("/api/receipts", 400, receipt("CI-BAD", -1));
    await request("/api/receipts", 400, { ...receipt("CI-BAD"), receivedOn: "2026-02-30" });
    await request("/api/receipts", 400, { ...receipt("CI-BAD"), supplierId: 2147483647 });
    await request("/api/receipts", 400, { ...receipt("CI-BAD"), materialId: 2147483647 });
    await request(`/api/materials/${materialId}`, 409, { ...material, unit: "кг" }, "PATCH");
    assert.deepEqual(await dashboard(), original);
  });

  test("I08 Параллельные поступления без потери остатка", async () => {
    const results = await Promise.all(
      [1, 2, 3].map((index) => request("/api/receipts", 201, receipt(`CI-C${index}`, 2))),
    );
    assert.equal(new Set(results.map(({ id }) => id)).size, 3);
    assert.equal((await current()).balance, 18);
  });
}
