import type { Product as PrismaProduct, UnitOfMeasure } from "@prisma/client";
import { ProductSchema, type Product } from "@hesabyar/shared";

type ProductRow = PrismaProduct & {
  defaultUnit?: UnitOfMeasure | null;
};

export function toProductDto(row: ProductRow): Product {
  return ProductSchema.parse({
    id: row.id,
    sku: row.sku,
    name: row.name,
    unitPrice: row.unitPrice.toString(),
    costPrice: row.costPrice.toString(),
    stockQty: row.stockQty,
    vatRate: row.vatRate,
    defaultUnitId: row.defaultUnitId,
    defaultUnitNameFa: row.defaultUnit?.nameFa ?? null,
    isActive: row.isActive,
  });
}
