import { createSupplier, getDashboard } from "@/lib/repository";
import { apiError, readJson } from "@/lib/api";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    return Response.json((await getDashboard()).suppliers);
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request) {
  try {
    return Response.json(await createSupplier(await readJson(request)), {
      status: 201,
    });
  } catch (error) {
    return apiError(error);
  }
}
