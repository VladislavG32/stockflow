import { createReceipt, getDashboard } from "@/lib/repository";
import { apiError, readJson } from "@/lib/api";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    return Response.json((await getDashboard()).receipts);
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request) {
  try {
    return Response.json(await createReceipt(await readJson(request)), {
      status: 201,
    });
  } catch (error) {
    return apiError(error);
  }
}
