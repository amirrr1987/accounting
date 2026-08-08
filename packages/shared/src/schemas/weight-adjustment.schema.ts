import { z } from "zod";

export const WeightAdjustmentKindSchema = z.enum(["SHORTAGE", "SURPLUS"]);
export type WeightAdjustmentKind = z.infer<typeof WeightAdjustmentKindSchema>;

export const WEIGHT_ADJUSTMENT_KIND_LABELS: Record<WeightAdjustmentKind, string> =
  {
    SHORTAGE: "کسر بار",
    SURPLUS: "اضافه بار",
  };

export const CreateWeightAdjustmentSchema = z.object({
  productId: z.string().uuid(),
  kind: WeightAdjustmentKindSchema,
  quantity: z.number().int().positive(),
  reason: z.string().min(1).max(500),
  dateJalali: z.string().regex(/^\d{4}\/\d{2}\/\d{2}$/),
  sourceInvoiceId: z.string().uuid().nullable().optional(),
});
export type CreateWeightAdjustmentInput = z.infer<
  typeof CreateWeightAdjustmentSchema
>;

export const WeightAdjustmentSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  productName: z.string(),
  kind: WeightAdjustmentKindSchema,
  quantity: z.number().int(),
  reason: z.string(),
  dateJalali: z.string(),
  costAmount: z.string(),
  sourceInvoiceId: z.string().uuid().nullable(),
  sourceInvoiceNumber: z.string().nullable().optional(),
  voucherId: z.string().uuid().nullable(),
  voucherNumber: z.string().nullable(),
});
export type WeightAdjustment = z.infer<typeof WeightAdjustmentSchema>;

export const WeightAdjustmentListSchema = z.array(WeightAdjustmentSchema);

export const WEIGHT_ADJUSTMENT_POSTING_CODES = {
  inventory: "11301",
  shortage: "51203",
  surplus: "41103",
} as const;
