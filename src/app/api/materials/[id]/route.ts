import { updateLimits, updateMaterial } from "@/lib/repository";
import { apiError, HttpError, readJson } from "@/lib/api";
import { limitsSchema } from "@/lib/validation";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    if (!/^[1-9]\d*$/.test(id) || Number(id) > 2147483647)
      throw new HttpError(400, "Некорректный ID материала");
    const input = await readJson(request);
    const row = await (limitsSchema.strict().safeParse(input).success
      ? updateLimits(Number(id), input)
      : updateMaterial(Number(id), input));
    if (!row) throw new HttpError(404, "Материал не найден");
    return Response.json(row);
  } catch (error) {
    return apiError(error);
  }
}
