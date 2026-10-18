// Контракт ЛР №2 сохранён. Готовность PostgreSQL проверяется отдельно: /api/ready.
export function GET() {
  return Response.json({ status: "ok", service: "stockflow" });
}
