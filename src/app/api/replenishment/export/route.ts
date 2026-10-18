import { getDashboard } from "@/lib/repository";
import { apiError } from "@/lib/api";
import { csvCell } from "@/lib/inventory";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const { materials } = await getDashboard();
    const rows = [
      [
        "Код",
        "Материал",
        "Ед. изм.",
        "Остаток",
        "Минимум",
        "Цель",
        "К закупке",
      ],
      ...materials
        .filter((item) => item.shortage)
        .map((item) => [
          item.code,
          item.name,
          item.unit,
          item.balance,
          item.minimumStock,
          item.targetStock,
          item.recommended,
        ]),
    ];
    // BOM помогает Excel распознать русский текст как UTF-8; точка с запятой удобна для ru-RU.
    return new Response(
      "\uFEFF" + rows.map((row) => row.map(csvCell).join(";")).join("\r\n"),
      {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition":
            'attachment; filename="stockflow-replenishment.csv"',
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return apiError(error);
  }
}
