import { getDashboard } from "@/lib/repository";
import { apiError } from "@/lib/api";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    return Response.json(await getDashboard(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return apiError(error);
  }
}
