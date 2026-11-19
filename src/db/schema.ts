import { sql } from "drizzle-orm";
import {
  check,
  jsonb,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

// Справочники хранят описание материала, но не остаток: остаток считается из операций.
export const materials = pgTable(
  "materials",
  {
    id: serial("id").primaryKey(),
    code: varchar("code", { length: 40 }).notNull().unique(),
    name: varchar("name", { length: 160 }).notNull(),
    category: varchar("category", { length: 100 }).notNull(),
    unit: varchar("unit", { length: 20 }).notNull(),
    additionalUnits: jsonb("additional_units").$type<string[]>().notNull().default([]),
    minimumStock: integer("minimum_stock").notNull().default(0),
    targetStock: integer("target_stock").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      "materials_stock_limits",
      sql`${table.minimumStock} >= 0 AND ${table.targetStock} >= ${table.minimumStock} AND ${table.targetStock} <= 1000000`,
    ),
  ],
);

export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 160 }).notNull().unique(),
  contact: varchar("contact", { length: 200 }).notNull().default(""),
  taxId: varchar("tax_id", { length: 12 }).notNull().default(""),
  legalAddress: varchar("legal_address", { length: 250 }).notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Одна запись — поступление одного материала от одного поставщика.
// Внешние ключи запрещают операции с несуществующими справочниками даже в обход API.
export const receipts = pgTable(
  "receipts",
  {
    id: serial("id").primaryKey(),
    number: varchar("number", { length: 40 }).notNull().unique(),
    materialId: integer("material_id")
      .notNull()
      .references(() => materials.id, { onDelete: "restrict" }),
    supplierId: integer("supplier_id")
      .notNull()
      .references(() => suppliers.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull(),
    unitPriceKopecks: integer("unit_price_kopecks"),
    documentReference: text("document_reference"),
    receivedOn: varchar("received_on", { length: 10 }).notNull(),
    note: varchar("note", { length: 500 }).notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      "receipts_positive_quantity",
      sql`${table.quantity} > 0 AND ${table.quantity} <= 1000000`,
    ),
    check("receipts_nonnegative_unit_price", sql`${table.unitPriceKopecks} >= 0`),
    index("receipts_material_idx").on(table.materialId),
    index("receipts_supplier_idx").on(table.supplierId),
  ],
);
