// Дополнительные запреты для учебных миграций. Это узкая политика проекта,
// не полноценный SQL-парсер и не замена Squawk и проверки на настоящем PostgreSQL.
import { readdirSync, readFileSync } from "node:fs";
const paths = readdirSync("drizzle").filter((name) => name.endsWith(".sql"));
for (const name of paths) {
  const sql = readFileSync(`drizzle/${name}`, "utf8").replace(/--[^\n]*/g, "");
  if (/\b(drop\s+(table|column|schema|database)|truncate|delete\s+from|alter\s+role|grant\s+all|copy\b.*\bprogram)\b/is.test(sql)) {
    throw new Error(`${name}: запрещённая операция; нужна отдельная проверенная стратегия без потери данных`);
  }
}
console.log(`PASS SQL policy: ${paths.length} миграций`);
