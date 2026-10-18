// Анализируем SQL в том же контексте таймаутов, который задаёт migrate.mjs.
// Исходную миграцию ЛР3 не переписываем: иначе изменился бы её hash в журнале.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
mkdirSync("artifacts/sql", { recursive: true });
for (const dir of ["drizzle", "database/post-migrate", "database/schema"]) {
 for (const file of readdirSync(dir).filter(f => f.endsWith(".sql"))) {
  writeFileSync(`artifacts/sql/${file}`, "SET lock_timeout = '5s';\nSET statement_timeout = '60s';\n" + readFileSync(`${dir}/${file}`, "utf8"));
 }
}
