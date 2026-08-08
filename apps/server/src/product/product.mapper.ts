import type { Product as PrismaProduct } from "@prisma/client";
import { ProductSchema, type Product } from "@hesabyar/shared";

export function toProductDto(row: PrismaProduct): Product {
  return ProductSchema.parse({
    id: row.id,
    sku: row.sku,
    name: row.name,
    unitPrice: row.unitPrice.toString(),
    costPrice: row.costPrice.toString(),
    stockQty: row.stockQty,
    vatRate: row.vatRate,
    isActive: row.isActive,
  });
}
