import "dotenv/config";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

// Отдельный процесс миграций завершится до старта приложения. Ошибка останавливает контейнер.
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
});
try {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  console.log("Миграции StockFlow применены");
} catch {
  console.error(
    "Не удалось применить миграции. Проверьте DATABASE_URL и доступность PostgreSQL",
  );
  process.exitCode = 1;
} finally {
  await pool.end();
}
