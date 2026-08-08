import { z } from "zod";

export const BusinessTypeSchema = z.enum([
  "SHOP",
  "WORKSHOP",
  "WAREHOUSE",
  "FACTORY",
  "COMPANY",
  "OTHER",
]);
export type BusinessType = z.infer<typeof BusinessTypeSchema>;

export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  SHOP: "فروشگاه",
  WORKSHOP: "کارگاه",
  WAREHOUSE: "انبار",
  FACTORY: "کارخانه",
  COMPANY: "شرکت",
  OTHER: "سایر (نام دلخواه)",
};

export const BusinessSettingsSchema = z.object({
  businessName: z.string().min(1).max(200),
  businessType: BusinessTypeSchema,
  businessTypeCustom: z.string().max(100).nullable(),
  legalName: z.string().max(200).nullable(),
  nationalId: z.string().max(20).nullable(),
  economicCode: z.string().max(20).nullable(),
  phone: z.string().max(32).nullable(),
  mobile: z.string().max(32).nullable(),
  address: z.string().max(500).nullable(),
  city: z.string().max(100).nullable(),
  postalCode: z.string().max(16).nullable(),
  description: z.string().max(1000).nullable(),
});
export type BusinessSettings = z.infer<typeof BusinessSettingsSchema>;

export const UpdateBusinessSettingsSchema = BusinessSettingsSchema.superRefine(
  (data, ctx) => {
    if (data.businessType === "OTHER" && !data.businessTypeCustom?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "برای نوع «سایر» نام دلخواه الزامی است",
        path: ["businessTypeCustom"],
      });
    }
  },
);
export type UpdateBusinessSettingsInput = z.infer<
  typeof UpdateBusinessSettingsSchema
>;

/** برچسب نمایشی نوع کسب‌وکار */
export function businessTypeDisplayLabel(
  type: BusinessType,
  custom: string | null | undefined,
): string {
  if (type === "OTHER" && custom?.trim()) {
    return custom.trim();
  }
  return BUSINESS_TYPE_LABELS[type];
}

/** عنوان کامل برای سربرگ گزارش‌ها: «فروشگاه XYZ» */
export function formatBusinessTitle(settings: BusinessSettings): string {
  const kind = businessTypeDisplayLabel(
    settings.businessType,
    settings.businessTypeCustom,
  );
  return `${kind} ${settings.businessName}`;
}
