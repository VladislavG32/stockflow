import "dotenv/config";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { materials, receipts, suppliers } from "../src/db/schema";
import {
  materialSchema,
  receiptSchema,
  supplierSchema,
} from "../src/lib/validation";

// Только явная команда db:seed добавляет вымышленные примеры. При обычном запуске БД пуста.
// Уникальные коды и ON CONFLICT делают повторный seed безопасным: остатки не удваиваются.
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  const db = drizzle(pool);
  await db.transaction(async (tx) => {
    const supplierValues = [
      {
        name: "ОфисСнаб (учебный)",
        contact: "Канцелярия и расходные материалы · вымышленный поставщик",
      },
      {
        name: "ТехноКомплект (учебный)",
        contact: "Кабели и комплектующие · вымышленный поставщик",
      },
    ];
    for (const item of supplierValues)
      await tx
        .insert(suppliers)
        .values(supplierSchema.parse(item))
        .onConflictDoNothing();
    const items = [
      {
        code: "DEMO-МТ-001",
        name: "Бумага офисная А4",
        category: "Канцелярия",
        unit: "упак.",
        minimumStock: 50,
        targetStock: 150,
        quantity: 120,
        supplier: supplierValues[0].name,
      },
      {
        code: "DEMO-МТ-002",
        name: "Кабель сетевой UTP",
        category: "Комплектующие",
        unit: "м",
        minimumStock: 200,
        targetStock: 500,
        quantity: 350,
        supplier: supplierValues[1].name,
      },
      {
        code: "DEMO-МТ-003",
        name: "Картридж лазерный",
        category: "Расходные материалы",
        unit: "шт.",
        minimumStock: 10,
        targetStock: 30,
        quantity: 8,
        supplier: supplierValues[0].name,
      },
    ];
    for (const [index, item] of items.entries()) {
      const { quantity, supplier, ...material } = item;
      await tx
        .insert(materials)
        .values(materialSchema.parse(material))
        .onConflictDoNothing();
      const [storedMaterial] = await tx
        .select()
        .from(materials)
        .where(eq(materials.code, item.code));
      const [storedSupplier] = await tx
        .select()
        .from(suppliers)
        .where(eq(suppliers.name, supplier));
      await tx
        .insert(receipts)
        .values(
          receiptSchema.parse({
            number: `DEMO-ПР-00${index + 1}`,
            materialId: storedMaterial.id,
            supplierId: storedSupplier.id,
            quantity,
            receivedOn: "2026-10-18",
            note: "Учебные данные ЛР №3. Добавлены командой db:seed.",
          }),
        )
        .onConflictDoNothing();
    }
  });
  console.log(
    "Учебные данные ЛР №3 добавлены. Существующие записи не изменены.",
  );
}
main()
  .catch(() => {
    console.error("Seed не выполнен: проверьте БД и миграции");
    process.exitCode = 1;
  })
  .finally(() => pool.end());
