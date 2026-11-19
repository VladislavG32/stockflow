import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const length = Number(process.argv[2]);
assert.ok([1, 2, 3].includes(length));
const connection = new URL(process.env.DATABASE_URL);
assert.equal(connection.hostname, "db");
assert.equal(connection.username, "stockflow_ci");
assert.equal(connection.pathname, "/stockflow_ci");
connection.pathname = "/stockflow_ci_reference";
const pool = new pg.Pool({ connectionString: connection.href });
const folder = await mkdtemp(join(tmpdir(), "stockflow-prefix-"));
try {
  const { rows } = await pool.query(`
    select current_database() as name, current_setting('stockflow.ci_run', true) as run
  `);
  assert.match(process.env.CI_RUN_ID ?? "", /^[a-f0-9-]{36}$/);
  assert.deepEqual(rows, [{ name: "stockflow_ci_reference", run: process.env.CI_RUN_ID }]);
  const journal = JSON.parse(await readFile("./drizzle/meta/_journal.json", "utf8"));
  assert.equal(journal.entries[length - 1]?.idx, length - 1);
  await cp("./drizzle", folder, { recursive: true });
  await writeFile(join(folder, "meta/_journal.json"), JSON.stringify({
    ...journal, entries: journal.entries.slice(0, length),
  }));
  await migrate(drizzle(pool), { migrationsFolder: folder });
} finally {
  await pool.end();
  await rm(folder, { recursive: true, force: true });
}
