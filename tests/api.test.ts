import assert from "node:assert/strict";
import { test } from "node:test";
import { apiError, HttpError, readJson } from "../src/lib/api";
import { matchesStockFilter } from "../src/lib/inventory";
import { supplierSchema } from "../src/lib/validation";

test("API: ошибки PostgreSQL и обёртки Drizzle имеют безопасный HTTP-ответ", async () => {
  // Пароль здесь — обычный текст примера. Он не должен оказаться в JSON ответа.
  for (const [code, status] of [["23505", 409], ["23503", 400], ["23514", 400], ["08006", 503]] as const) {
    const response = apiError({ cause: { code, message: "private connection details" } });
    assert.equal(response.status, status);
    assert.doesNotMatch(await response.text(), /private connection details/);
  }
  assert.equal(apiError(new HttpError(404, "Не найдено")).status, 404);
  assert.equal(apiError(supplierSchema.safeParse({ name: "" }).error).status, 400);
});

test("JSON: защита источника, формата, размера и синтаксиса", async () => {
  const request = (body: string, headers = {}) => new Request("http://localhost/api/materials", {
    method: "POST", body, headers: { host: "localhost", "content-type": "application/json", ...headers },
  });
  assert.deepEqual(await readJson(request('{"name":"Материал"}')), { name: "Материал" });
  for (const [input, status] of [
    [request("{}", { origin: "https://foreign.example" }), 403],
    [request("{}", { origin: "invalid" }), 403],
    [request("{}", { "content-type": "text/plain" }), 415],
    [request("{"), 400],
    [request("x".repeat(16385)), 413],
  ] as const) {
    await assert.rejects(readJson(input), (error: unknown) => error instanceof HttpError && error.status === status);
  }
});

test("ЛР5: нулевой остаток выделяется независимо от минимального запаса", () => {
  assert.equal(matchesStockFilter(0, false, "empty"), true);
  assert.equal(matchesStockFilter(1, true, "empty"), false);
  assert.equal(matchesStockFilter(8, true, "low"), true);
  assert.equal(matchesStockFilter(10, false, "normal"), true);
  assert.equal(matchesStockFilter(0, true, ""), true);
});

test("Поставщик: нормализация, пустое имя, длина и неизвестные поля", () => {
  assert.deepEqual(supplierSchema.parse({ name: " Партнёр " }), { name: "Партнёр", contact: "" });
  for (const input of [{ name: " " }, { name: "x".repeat(161) }, { name: "A", admin: true }]) {
    assert.equal(supplierSchema.safeParse(input).success, false);
  }
});
