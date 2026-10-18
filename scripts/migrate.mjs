import "dotenv/config";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { readFileSync } from "node:fs";
import { readMigrationFiles } from "drizzle-orm/migrator";

// Отдельный процесс миграций завершится до старта приложения. Ошибка останавливает контейнер.
const url = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null;
// Для репетиции разрешено менять только имя специально созданной временной БД.
// Пароль остаётся внутри контейнера и не печатается в журнал.
if (process.env.MIGRATION_DATABASE) {
  if (!url || !/^stockflow_rehearsal_\d+$/.test(process.env.MIGRATION_DATABASE)) {
    throw new Error("Invalid rehearsal database");
  }
  url.pathname = `/${process.env.MIGRATION_DATABASE}`;
}
const pool = new pg.Pool({
  connectionString: url?.toString(),
  connectionTimeoutMillis: 5000,
  max: 1,
});
let client;
let phase = "подключение к PostgreSQL";
try {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  client = await pool.connect();
  phase = "получение блокировки мигратора";
  // Не ждём блокировок бесконечно на маленьком учебном стенде.
  await client.query("SET lock_timeout = '5s'; SET statement_timeout = '60s'");
  const lock = await client.query("SELECT pg_try_advisory_lock(734081) AS acquired");
  if (!lock.rows[0].acquired) throw new Error("Another migration is running");
  phase = "проверка неизменяемой истории SQL";
  // Drizzle отслеживает время применения, но сам не запрещает переписывание уже
  // применённого файла. Сверяем hash всей истории, чтобы не скрыть такое расхождение.
  const exists = await client.query("SELECT to_regclass('drizzle.__drizzle_migrations') AS journal");
  if (exists.rows[0].journal) {
    const applied = await client.query("SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at,id");
    const files = readMigrationFiles({ migrationsFolder: "./drizzle" });
    if (applied.rows.length > files.length || applied.rows.some((row, index) =>
      row.hash !== files[index].hash || Number(row.created_at) !== files[index].folderMillis)) {
      throw new Error("Migration history differs from immutable files");
    }
  }
  phase = "применение версионированных миграций";
  await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
  // Drizzle уже закоммитил ADD CONSTRAINT NOT VALID. Проверка существующих строк
  // выполняется отдельно и повторяется безопасно, если предыдущий запуск прервался.
  phase = "валидация ограничения цены после COMMIT";
  await client.query(readFileSync("database/post-migrate/validate-price.sql", "utf8"));
  console.log("Миграции StockFlow применены");
} catch {
  console.error(
    `Не удалось применить миграции. Этап: ${phase}. Проверьте доступность БД и историю SQL; URL и SQL ошибки не выводятся`,
  );
  process.exitCode = 1;
} finally {
  if (client) {
    await client.query("SELECT pg_advisory_unlock(734081)").catch(() => {});
    client.release();
  }
  await pool.end();
}
