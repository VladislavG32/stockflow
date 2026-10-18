import { Dashboard } from "@/components/dashboard";
import { getDashboard } from "@/lib/repository";
import type { DashboardData } from "@/lib/types";

// БД запрашивается при открытии страницы, а не во время build.
// Сборка образа не требует подключения к PostgreSQL и настоящих секретов.
export const dynamic = "force-dynamic";

export default async function Home() {
  let data: DashboardData | null = null;
  try {
    data = await getDashboard();
  } catch {
    console.error("StockFlow: initial database snapshot unavailable");
  }
  return <Dashboard initialData={data} />;
}
