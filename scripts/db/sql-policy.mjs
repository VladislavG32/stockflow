// Дополнительные запреты для учебных миграций. Это узкая политика проекта,
// не полноценный SQL-парсер и не замена Squawk и проверки на настоящем PostgreSQL.
import { readdirSync, readFileSync } from "node:fs";
const paths = ["drizzle", "database/post-migrate", "database/schema"].flatMap(dir =>
  readdirSync(dir).filter(name => name.endsWith(".sql")).map(name => `${dir}/${name}`));
for (const name of paths) {
  const sql = readFileSync(name, "utf8").replace(/--[^\n]*/g, "");
  if (/\b(drop\s+(table|column|schema|database)|truncate|delete\s+from|alter\s+role|grant\s+all|copy\b.*\bprogram)\b/is.test(sql)) {
    throw new Error(`${name}: запрещённая операция; нужна отдельная проверенная стратегия без потери данных`);
  }
}
console.log(`PASS SQL policy: ${paths.length} SQL-файлов`);
