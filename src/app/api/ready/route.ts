import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { apiError } from "@/lib/api";

export const dynamic = "force-dynamic";
// /health сохраняет контракт ЛР №2; /ready проверяет также доступность схемы PostgreSQL.
export async function GET() {
  try {
    await getDb().execute(sql`select id from materials limit 1`);
    await getDb().execute(sql`select id from suppliers limit 1`);
    await getDb().execute(sql`select id from receipts limit 1`);
    return Response.json({
      status: "ok",
      service: "stockflow",
      database: "ok",
    });
  } catch (error) {
    return apiError(error);
  }
}
