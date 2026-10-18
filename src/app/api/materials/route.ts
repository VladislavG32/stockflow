import { createMaterial, getDashboard } from "@/lib/repository";
import { apiError, readJson } from "@/lib/api";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    return Response.json((await getDashboard()).materials);
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request) {
  try {
    return Response.json(await createMaterial(await readJson(request)), {
      status: 201,
    });
  } catch (error) {
    return apiError(error);
  }
}
