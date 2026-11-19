import type { Receipt, Supplier } from "./types";

export function materialSuppliers(suppliers: Supplier[], receipts: Receipt[], materialId: number) {
  const ids = new Set(receipts.filter((receipt) => receipt.materialId === materialId).map((receipt) => receipt.supplierId));
  return suppliers.filter((supplier) => ids.has(supplier.id));
}

export function receiptView(receipts: Receipt[], query: string, materialId: number | null) {
  const search = query.trim().toLocaleLowerCase("ru-RU");
  return receipts.filter((item) =>
    (materialId === null || item.materialId === materialId) &&
    [item.number, item.materialName, item.supplierName, item.note].some((value) =>
      value.toLocaleLowerCase("ru-RU").includes(search),
    ),
  );
}
