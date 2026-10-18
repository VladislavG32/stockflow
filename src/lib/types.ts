// Этот контракт содержит только данные JSON; клиент не импортирует код доступа к PostgreSQL.
export type Material = {
  id: number;
  code: string;
  name: string;
  category: string;
  unit: string;
  minimumStock: number;
  targetStock: number;
  balance: number;
  shortage: boolean;
  recommended: number;
};
export type Supplier = { id: number; name: string; contact: string };
export type Receipt = {
  id: number;
  number: string;
  materialId: number;
  supplierId: number;
  materialName: string;
  supplierName: string;
  unit: string;
  quantity: number;
  unitPriceKopecks: number | null;
  totalKopecks: number | null;
  receivedOn: string;
  note: string;
};
export type DashboardData = {
  materials: Material[];
  suppliers: Supplier[];
  receipts: Receipt[];
};
