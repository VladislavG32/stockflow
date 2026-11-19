import { z } from "zod";
import { MAX_UNIT_PRICE_KOPECKS } from "./inventory";

// Русские сообщения по умолчанию используются и для ошибок типа данных/обязательных полей.
z.config(z.locales.ru());

const text = (max: number) =>
  z
    .string()
    .trim()
    .min(1, "Заполните обязательное поле")
    .max(max, `Не более ${max} символов`);
const stock = z
  .number()
  .int("Введите целое число")
  .min(0, "Значение не может быть отрицательным")
  .max(1000000, "Не более 1 000 000");

// Проверка повторяется на сервере: ограничения HTML можно обойти прямым HTTP-запросом.
// Числа принимаются именно как числа JSON, поэтому пустая строка не превращается в ноль.
export const materialSchema = z
  .object({
    code: text(40).transform((value) => value.toUpperCase()),
    name: text(160),
    category: text(100),
    unit: text(20),
    additionalUnits: z.array(text(20)).max(10).default([]),
    minimumStock: stock,
    targetStock: stock,
  })
  .strict()
  .refine(({ unit, additionalUnits }) => {
    const units = [unit, ...additionalUnits].map((value) => value.toLocaleLowerCase("ru-RU"));
    return new Set(units).size === units.length;
  }, { message: "Единицы измерения должны различаться", path: ["additionalUnits"] })
  .refine((value) => value.targetStock >= value.minimumStock, {
    message: "Целевой запас должен быть не меньше минимального",
    path: ["targetStock"],
  });

export const limitsSchema = z
  .object({ minimumStock: stock, targetStock: stock })
  .strict()
  .refine((value) => value.targetStock >= value.minimumStock, {
    message: "Целевой запас должен быть не меньше минимального",
    path: ["targetStock"],
  });

export const supplierSchema = z
  .object({
    name: text(160),
    contact: z.string().trim().max(200, "Не более 200 символов").default(""),
    taxId: z.string().trim().regex(/^(?:\d{10}|\d{12})?$/, "ИНН должен содержать 10 или 12 цифр").default(""),
    legalAddress: z.string().trim().max(250).default(""),
  })
  .strict();

// Сравнение с ISO-строкой отсекает несуществующие даты, например 2026-02-30.
const calendarDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Дата должна иметь формат ГГГГ-ММ-ДД")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return (
      Number.isFinite(date.getTime()) &&
      date.toISOString().slice(0, 10) === value &&
      value >= "2000-01-01" &&
      value <= "2100-12-31"
    );
  }, "Укажите существующую дату с 2000 по 2100 год");

export const receiptSchema = z
  .object({
    number: text(40).transform((value) => value.toUpperCase()),
    materialId: z.number().int().positive().max(2147483647),
    supplierId: z.number().int().positive().max(2147483647),
    quantity: stock.refine(
      (value) => value > 0,
      "Количество должно быть больше нуля",
    ),
    unitPriceKopecks: z.number().int().min(0).max(MAX_UNIT_PRICE_KOPECKS).nullable().default(null),
    documentReference: z.string().trim().max(80).nullable().default(null)
      .transform((value) => value || null),
    receivedOn: calendarDate,
    note: z.string().trim().max(500, "Не более 500 символов").default(""),
  })
  .strict();
