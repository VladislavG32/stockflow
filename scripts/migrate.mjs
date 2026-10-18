import "dotenv/config";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

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
try {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  client = await pool.connect();
  // Не ждём блокировок бесконечно на маленьком учебном стенде.
  await client.query("SET lock_timeout = '5s'; SET statement_timeout = '60s'");
  const lock = await client.query("SELECT pg_try_advisory_lock(734081) AS acquired");
  if (!lock.rows[0].acquired) throw new Error("Another migration is running");
  await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
  console.log("Миграции StockFlow применены");
} catch {
  console.error(
    "Не удалось применить миграции. Проверьте DATABASE_URL и доступность PostgreSQL",
  );
  process.exitCode = 1;
} finally {
  if (client) {
    await client.query("SELECT pg_advisory_unlock(734081)").catch(() => {});
    client.release();
  }
  await pool.end();
}
