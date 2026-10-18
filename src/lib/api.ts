import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

// Ограничение размера защищает учебный сервер от случайно отправленного большого JSON.
export async function readJson(request: Request) {
  const origin = request.headers.get("origin");
  let originHost: string | undefined;
  if (origin) {
    try {
      originHost = new URL(origin).host;
    } catch {
      throw new HttpError(403, "Некорректный источник запроса");
    }
  }
  if (origin && originHost !== request.headers.get("host")) {
    throw new HttpError(
      403,
      "Изменения разрешены только из интерфейса этого сервера",
    );
  }
  if (
    request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !==
    "application/json"
  ) {
    throw new HttpError(415, "Ожидается application/json");
  }
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Пустое тело запроса");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 16384) {
      await reader.cancel();
      throw new HttpError(413, "Слишком большой запрос");
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch {
    throw new HttpError(400, "Некорректный JSON");
  }
}

// Drizzle оборачивает ошибку драйвера в cause. Наружу не отдаём SQL, URL и пароль подключения.
export function apiError(error: unknown): Response {
  if (error instanceof HttpError)
    return Response.json({ error: error.message }, { status: error.status });
  if (error instanceof ZodError)
    return Response.json(
      {
        error: error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join("; "),
      },
      { status: 400 },
    );
  const cause =
    error && typeof error === "object" && "cause" in error
      ? error.cause
      : error;
  const code =
    cause && typeof cause === "object" && "code" in cause
      ? String(cause.code)
      : "unknown";
  if (code === "23505")
    return Response.json(
      { error: "Запись с таким кодом, номером или названием уже существует" },
      { status: 409 },
    );
  if (code === "23503")
    return Response.json(
      { error: "Материал или поставщик не найден. Обновите справочники" },
      { status: 400 },
    );
  if (code === "23514")
    return Response.json(
      { error: "Данные нарушают ограничения складского учёта" },
      { status: 400 },
    );
  console.error("StockFlow: database request failed", { code });
  return Response.json(
    {
      error:
        "База данных недоступна или миграции не применены. Проверьте запуск PostgreSQL",
    },
    { status: 503 },
  );
}
