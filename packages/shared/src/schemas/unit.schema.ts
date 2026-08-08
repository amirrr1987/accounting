import { z } from "zod";

export const UnitOfMeasureSchema = z.object({
  id: z.string().uuid(),
  code: z.string().min(1).max(16),
  nameFa: z.string().min(1).max(64),
  baseUnitId: z.string().uuid().nullable(),
  baseUnitNameFa: z.string().nullable().optional(),
  conversionFactor: z.number().positive(),
  isActive: z.boolean(),
});
export type UnitOfMeasure = z.infer<typeof UnitOfMeasureSchema>;

export const CreateUnitSchema = z.object({
  code: z.string().min(1).max(16),
  nameFa: z.string().min(1).max(64),
  baseUnitId: z.string().uuid().nullable().optional(),
  conversionFactor: z.number().positive().default(1),
  isActive: z.boolean().optional().default(true),
});
export type CreateUnitInput = z.infer<typeof CreateUnitSchema>;

export const UnitListSchema = z.array(UnitOfMeasureSchema);

/** تبدیل مقدار به واحد پایه برای موجودی */
export function toBaseQuantity(
  quantity: number,
  conversionFactor: number,
): number {
  return Math.round(quantity * conversionFactor);
}

/** واحدهای پیش‌فرض سیستم — baseUnitId در seed با code واحد پایه resolve می‌شود */
export const DEFAULT_UNITS: ReadonlyArray<{
  code: string;
  nameFa: string;
  baseUnitId: string | null;
  conversionFactor: number;
}> = [
  { code: "KG", nameFa: "کیلوگرم", baseUnitId: null, conversionFactor: 1 },
  { code: "PACK", nameFa: "بسته", baseUnitId: null, conversionFactor: 1 },
  { code: "BAG", nameFa: "کیسه", baseUnitId: "PACK", conversionFactor: 1 },
  { code: "CARTON", nameFa: "کارتن", baseUnitId: "PACK", conversionFactor: 12 },
  { code: "BOTTLE", nameFa: "بطری", baseUnitId: "PACK", conversionFactor: 1 },
  { code: "CAN", nameFa: "حلب", baseUnitId: "PACK", conversionFactor: 1 },
];
