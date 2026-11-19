import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { readMigrationFiles } from "drizzle-orm/migrator";

const connection = new URL(process.env.DATABASE_URL);
assert.equal(connection.hostname, "db");
assert.equal(connection.pathname, "/stockflow_ci");
assert.equal(connection.username, "stockflow_ci");
const fresh = new pg.Pool({ connectionString: connection.href });
const upgradeFolder = await mkdtemp(join(tmpdir(), "stockflow-drizzle-"));
let upgraded;

try {
  const { rows } = await fresh.query(`
    select current_database() as database, current_user as role,
      current_setting('stockflow.ci_run', true) as run
  `);
  assert.match(process.env.CI_RUN_ID ?? "", /^[a-f0-9-]{36}$/);
  assert.deepEqual(rows, [{ database: "stockflow_ci", role: "stockflow_ci", run: process.env.CI_RUN_ID }]);
  await fresh.query("create database stockflow_ci_upgrade template template0");
  connection.pathname = "/stockflow_ci_upgrade";
  upgraded = new pg.Pool({ connectionString: connection.href });

  const journal = JSON.parse(await readFile("./drizzle/meta/_journal.json", "utf8"));
  const previous = journal.entries.slice(0, 2);
  assert.equal(previous.at(-1)?.tag, "0001_lab7_catalog_fields");
  await cp("./drizzle", upgradeFolder, { recursive: true });
  await writeFile(join(upgradeFolder, "meta/_journal.json"), JSON.stringify({ ...journal, entries: previous }));
  await migrate(drizzle(upgraded), { migrationsFolder: upgradeFolder });
  await upgraded.query(`
    insert into materials (code, name, category, unit, additional_units, minimum_stock, target_stock)
      values ('HIST-1', 'Кабель', 'Электрика', 'м', '["рулон"]', 10, 20);
    insert into suppliers (name, tax_id, legal_address)
      values ('Поставщик', '7701234567', 'Москва');
    insert into receipts (number, material_id, supplier_id, quantity, received_on, note)
      values ('HIST-R1', 1, 1, 7, '2026-10-18', 'Историческая строка');
  `);
  const baseline = await upgraded.query(`
    select to_jsonb(receipts) as receipt, to_jsonb(materials) as material,
      to_jsonb(suppliers) as supplier
    from receipts join materials on materials.id = receipts.material_id
    join suppliers on suppliers.id = receipts.supplier_id
  `);
  await migrate(drizzle(upgraded), { migrationsFolder: "./drizzle" });
  await migrate(drizzle(upgraded), { migrationsFolder: "./drizzle" });
  const current = await upgraded.query(`
    select to_jsonb(receipts) - 'unit_price_kopecks' as receipt,
      to_jsonb(materials) as material, to_jsonb(suppliers) as supplier,
      unit_price_kopecks, (select sum(quantity)::int from receipts where material_id = materials.id) as balance
    from receipts join materials on materials.id = receipts.material_id
    join suppliers on suppliers.id = receipts.supplier_id
  `);
  assert.deepEqual(current.rows, [{ ...baseline.rows[0], unit_price_kopecks: null, balance: 7 }]);
  const expected = readMigrationFiles({ migrationsFolder: "./drizzle" })
    .map(({ hash, folderMillis }) => ({ hash, created_at: String(folderMillis) }));
  for (const pool of [fresh, upgraded]) {
    const { rows: history } = await pool.query("select hash, created_at from drizzle.__drizzle_migrations order by id");
    assert.deepEqual(history, expected);
  }
  console.log("Drizzle: чистая БД и обновление с 0001 имеют одинаковый журнал.");
  console.log("Записи поступления, материала и поставщика сохранены. Историческая цена NULL, остаток 7.");
} finally {
  await upgraded?.end();
  await fresh.end();
  await rm(upgradeFolder, { recursive: true, force: true });
}
