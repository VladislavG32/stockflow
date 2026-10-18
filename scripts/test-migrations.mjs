import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, copyFileSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

// Создаём НОВУЮ отдельную БД. Если такое имя уже занято, прекращаем тест,
// а не удаляем чужое содержимое. Подключение к рабочим базам запрещено.
const url = new URL(process.env.DATABASE_URL ?? "postgresql://invalid");
if (url.pathname !== "/stockflow_ci" || process.env.STOCKFLOW_TEST_DATABASE !== "stockflow_ci") {
  throw new Error("Only disposable stockflow_ci is allowed");
}
const admin = new pg.Pool({ connectionString: url.toString() });
const name = `stockflow_ci_migrations_${process.pid}`;
url.pathname = `/${name}`;
const pool = new pg.Pool({ connectionString: url.toString(), max: 1 });
mkdirSync("artifacts", { recursive: true });
const folder = mkdtempSync(join(process.cwd(), "artifacts/migrations-"));
const journal = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8"));
let created = false;
try {
  await admin.query(`CREATE DATABASE ${name}`);
  created = true;
  mkdirSync(join(folder, "meta"));
  for (const entry of journal.entries) copyFileSync(`drizzle/${entry.tag}.sql`, join(folder, `${entry.tag}.sql`));
  const run = async (last) => {
    writeFileSync(join(folder, "meta/_journal.json"), JSON.stringify({ ...journal, entries: journal.entries.slice(0, last + 1) }));
    await migrate(drizzle(pool), { migrationsFolder: folder });
  };
  await run(0);
  await pool.query("INSERT INTO materials(code,name,category,unit) VALUES('HISTORY','История','QA','шт.')");
  await pool.query("INSERT INTO suppliers(name) VALUES('Исторический поставщик')");
  await pool.query("INSERT INTO receipts(number,material_id,supplier_id,quantity,received_on) VALUES('HISTORY',1,1,8,'2026-10-18')");
  const before = (await pool.query("SELECT id,number,quantity,material_id,supplier_id,received_on FROM receipts")).rows;
  await run(1); // Точно та же первая SQL-миграция, которая запускается вручную.
  await pool.query(readFileSync("database/post-migrate/validate-price.sql", "utf8"));
  assert.equal((await pool.query("SELECT unit_price_kopecks FROM receipts")).rows[0].unit_price_kopecks, null);
  await pool.query("UPDATE receipts SET unit_price_kopecks=12345 WHERE number='HISTORY'");
  // Контрольная ветка ручного этапа содержит только 0000/0001. Финальная — и0002.
  const last = journal.entries.length - 1;
  await run(last);
  assert.deepEqual((await pool.query("SELECT id,number,quantity,material_id,supplier_id,received_on FROM receipts")).rows, before);
  assert.equal((await pool.query("SELECT unit_price_kopecks FROM receipts")).rows[0].unit_price_kopecks, 12345);
  if (last >= 2) assert.equal((await pool.query("SELECT document_reference FROM receipts")).rows[0].document_reference, null);
  await assert.rejects(pool.query("UPDATE receipts SET unit_price_kopecks=-1"), { code: "23514" });
  await run(last);
  assert.equal((await pool.query("SELECT count(*)::int n FROM drizzle.__drizzle_migrations")).rows[0].n, journal.entries.length);
  // Доказываем атомарность неудачной миграции. Ошибка живёт только во временной папке.
  const failing = { idx: journal.entries.length, version: "7", when: journal.entries.at(-1).when + 1, tag: "9999_test_only", breakpoints: true };
  writeFileSync(join(folder, "9999_test_only.sql"), "ALTER TABLE receipts ADD COLUMN failure_probe integer;--> statement-breakpoint\nSELECT 1/0;");
  writeFileSync(join(folder, "meta/_journal.json"), JSON.stringify({ ...journal, entries: [...journal.entries, failing] }));
  await assert.rejects(migrate(drizzle(pool), { migrationsFolder: folder }));
  const columns = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='receipts' AND column_name='failure_probe'");
  assert.equal(columns.rowCount, 0);
  assert.equal((await pool.query("SELECT count(*)::int n FROM drizzle.__drizzle_migrations")).rows[0].n, journal.entries.length);
  console.log(`PASS: ${journal.entries.length} миграций, исторические данные, CHECK, повторный запуск, rollback ошибки`);
} finally {
  await pool.end();
  if (created) await admin.query(`DROP DATABASE ${name}`);
  await admin.end();
  rmSync(folder, { recursive: true, force: true });
}
