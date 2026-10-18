import { updateLimits } from "@/lib/repository";
import { apiError, HttpError, readJson } from "@/lib/api";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    if (!/^[1-9]\d*$/.test(id) || Number(id) > 2147483647)
      throw new HttpError(400, "Некорректный ID материала");
    const row = await updateLimits(Number(id), await readJson(request));
    if (!row) throw new HttpError(404, "Материал не найден");
    return Response.json(row);
  } catch (error) {
    return apiError(error);
  }
}
