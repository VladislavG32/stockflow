import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const globalDb = globalThis as unknown as { stockflowPool?: Pool };

// Соединение создаётся при первом запросе, а не при сборке Next.js.
// Pool повторно использует подключения; globalThis защищает dev-режим от лишних пулов при HMR.
export function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }
  if (!globalDb.stockflowPool) {
    globalDb.stockflowPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      statement_timeout: 10000,
    });
    globalDb.stockflowPool.on("error", () =>
      console.error("PostgreSQL: idle connection lost"),
    );
  }
  return drizzle(globalDb.stockflowPool, { schema });
}
