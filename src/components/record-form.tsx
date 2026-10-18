"use client";

import { useState, type FormEvent } from "react";

export type Field = {
  name: string;
  label: string;
  type?: "text" | "number" | "date";
  maxLength?: number;
  optional?: boolean;
  min?: number;
  max?: number;
  defaultValue?: string | number;
  options?: { value: number; label: string }[];
};

// Переводит FormData в JSON и показывает результат. Структура полей задаётся снаружи,
// а бизнес-правила остаются на сервере в validation.ts.
export function RecordForm({
  endpoint,
  fields,
  onSaved,
  method = "POST",
  compact = false,
}: {
  endpoint: string;
  fields: Field[];
  onSaved: () => Promise<void>;
  method?: "POST" | "PATCH";
  compact?: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setPending(true);
    setMessage("");
    setFailed(false);
    const formData = new FormData(form);
    const payload = Object.fromEntries(
      fields.map((field) => {
        const value = String(formData.get(field.name) ?? "");
        return [
          field.name,
          field.type === "number" || field.options
            ? value === ""
              ? null
              : Number(value)
            : value,
        ];
      }),
    );
    try {
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error ?? "Не удалось сохранить запись");
      if (method === "POST") form.reset();
      setMessage("Сохранено в PostgreSQL.");
      // Запись уже сохранена: ошибка обновления списка не означает ошибку вставки.
      try {
        await onSaved();
      } catch {
        setMessage(
          "Запись сохранена. Не удалось обновить список — нажмите «Обновить данные».",
        );
      }
    } catch (error) {
      setFailed(true);
      setMessage(
        error instanceof Error &&
          !(error instanceof TypeError) &&
          !(error instanceof SyntaxError)
          ? error.message
          : "Не удалось получить ответ сервера. Обновите список и проверьте номер записи перед повторной отправкой.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <form
      onSubmit={submit}
      className={compact ? "record-form compact-form" : "record-form"}
    >
      <fieldset disabled={pending}>
        <legend className="sr-only">
          {method === "PATCH" ? "Настройка порогов запаса" : "Новая запись"}
        </legend>
        <div className="form-grid">
          {fields.map((field) => (
            <label key={field.name}>
              <span>
                {field.label}
                {field.optional ? " (необязательно)" : " *"}
              </span>
              {field.options ? (
                <select name={field.name} required defaultValue="">
                  <option value="" disabled>
                    Выберите…
                  </option>
                  {field.options.map((option) => (
                    <option value={option.value} key={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  name={field.name}
                  type={field.type ?? "text"}
                  required={!field.optional}
                  maxLength={field.maxLength}
                  min={field.min}
                  max={field.max}
                  step={field.type === "number" ? 1 : undefined}
                  defaultValue={field.defaultValue}
                />
              )}
            </label>
          ))}
        </div>
        <button className="button" type="submit">
          {pending
            ? "Сохранение…"
            : method === "PATCH"
              ? "Сохранить пороги"
              : "Сохранить запись"}
        </button>
      </fieldset>
      {message && (
        <p
          className={failed ? "form-message error-text" : "form-message"}
          role={failed ? "alert" : "status"}
        >
          {message}
        </p>
      )}
    </form>
  );
}
