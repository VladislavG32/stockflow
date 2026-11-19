import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { materials, receipts, suppliers } from "@/db/schema";
import { receiptCostKopecks, replenishment } from "./inventory";
import { HttpError } from "./api";
import type { DashboardData } from "./types";
import {
  limitsSchema,
  materialSchema,
  receiptSchema,
  supplierSchema,
} from "./validation";

// SUM выполняется PostgreSQL. LEFT JOIN сохраняет материалы без поступлений: у них остаток 0.
// REPEATABLE READ даёт всем трём запросам один снимок даже при одновременном поступлении.
export async function getDashboard(): Promise<DashboardData> {
  return getDb().transaction(
    async (tx) => {
      const rows = await tx
        .select({
          id: materials.id,
          code: materials.code,
          name: materials.name,
          category: materials.category,
          unit: materials.unit,
          additionalUnits: materials.additionalUnits,
          minimumStock: materials.minimumStock,
          targetStock: materials.targetStock,
          balance: sql<string>`coalesce(sum(${receipts.quantity}), 0)`,
        })
        .from(materials)
        .leftJoin(receipts, eq(materials.id, receipts.materialId))
        .groupBy(materials.id)
        .orderBy(materials.name);
      const supplierRows = await tx
        .select({
          id: suppliers.id,
          name: suppliers.name,
          contact: suppliers.contact,
          taxId: suppliers.taxId,
          legalAddress: suppliers.legalAddress,
        })
        .from(suppliers)
        .orderBy(suppliers.name);
      const receiptRows = await tx
        .select({
          id: receipts.id,
          number: receipts.number,
          materialId: receipts.materialId,
          supplierId: receipts.supplierId,
          quantity: receipts.quantity,
          unitPriceKopecks: receipts.unitPriceKopecks,
          receivedOn: receipts.receivedOn,
          note: receipts.note,
          materialName: materials.name,
          supplierName: suppliers.name,
          unit: materials.unit,
        })
        .from(receipts)
        .innerJoin(materials, eq(receipts.materialId, materials.id))
        .innerJoin(suppliers, eq(receipts.supplierId, suppliers.id))
        .orderBy(desc(receipts.receivedOn), desc(receipts.id));
      return {
        materials: rows.map((row) => {
          const balance = Number(row.balance);
          return {
            ...row,
            balance,
            ...replenishment(balance, row.minimumStock, row.targetStock),
          };
        }),
        suppliers: supplierRows,
        receipts: receiptRows.map((row) => ({
          ...row,
          totalCostKopecks: receiptCostKopecks(row.quantity, row.unitPriceKopecks),
        })),
      };
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
}

// Валидация находится и в слое данных: seed и API используют одинаковые правила.
export async function createMaterial(input: unknown) {
  const values = materialSchema.parse(input);
  const [row] = await getDb()
    .insert(materials)
    .values(values)
    .returning({ id: materials.id });
  return row;
}

export async function createSupplier(input: unknown) {
  const values = supplierSchema.parse(input);
  const [row] = await getDb()
    .insert(suppliers)
    .values(values)
    .returning({ id: suppliers.id });
  return row;
}

export async function createReceipt(input: unknown) {
  const values = receiptSchema.parse(input);
  return getDb().transaction(async (tx) => {
    // Согласуем вставку с изменением основной единицы измерения.
    await tx.select({ id: materials.id }).from(materials)
      .where(eq(materials.id, values.materialId)).for("key share");
    const [row] = await tx.insert(receipts).values(values).returning({ id: receipts.id });
    return row;
  });
}

export async function updateLimits(id: number, input: unknown) {
  const values = limitsSchema.parse(input);
  const [row] = await getDb()
    .update(materials)
    .set(values)
    .where(eq(materials.id, id))
    .returning({ id: materials.id });
  return row;
}

export async function updateMaterial(id: number, input: unknown) {
  const values = materialSchema.parse(input);
  return getDb().transaction(async (tx) => {
    const [material] = await tx.select({ unit: materials.unit }).from(materials)
      .where(eq(materials.id, id)).for("update");
    if (!material) return;
    if (material.unit !== values.unit) {
      const [receipt] = await tx.select({ id: receipts.id }).from(receipts)
        .where(eq(receipts.materialId, id)).limit(1);
      if (receipt) throw new HttpError(409, "Основную единицу нельзя менять после поступления");
    }
    const [row] = await tx.update(materials).set(values)
      .where(eq(materials.id, id)).returning({ id: materials.id });
    return row;
  });
}
