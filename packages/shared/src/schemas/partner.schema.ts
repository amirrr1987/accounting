import { z } from "zod";
import { MoneySchema } from "./voucher.schema";
import { ExpensePayFromSchema } from "./expense.schema";
import { JalaliDateStringSchema } from "./jalali-date.schema";

export const PARTNER_COA_PARENTS = {
  capital: "322",
  drawing: "332",
} as const;

export const PartnerSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  mobile: z.string().nullable(),
  nationalId: z.string().nullable(),
  sharePercent: z.number().min(0).max(100),
  coaCapitalAccountId: z.string().uuid(),
  coaCapitalAccountCode: z.string(),
  coaDrawingAccountId: z.string().uuid(),
  coaDrawingAccountCode: z.string(),
  isActive: z.boolean(),
});
export type Partner = z.infer<typeof PartnerSchema>;

export const PartnerListSchema = z.array(PartnerSchema);

export const CreatePartnerSchema = z.object({
  name: z.string().min(1).max(200),
  mobile: z.string().max(32).nullable().optional(),
  nationalId: z.string().max(20).nullable().optional(),
  sharePercent: z
    .number()
    .min(0.01, "سهم باید بزرگ‌تر از صفر باشد")
    .max(100, "سهم نمی‌تواند بیش از ۱۰۰ باشد"),
  isActive: z.boolean().optional().default(true),
});
export type CreatePartnerInput = z.infer<typeof CreatePartnerSchema>;

export const UpdatePartnerSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  mobile: z.string().max(32).nullable().optional(),
  nationalId: z.string().max(20).nullable().optional(),
  sharePercent: z.number().min(0.01).max(100).optional(),
  isActive: z.boolean().optional(),
});
export type UpdatePartnerInput = z.infer<typeof UpdatePartnerSchema>;

export const PartnerBalanceRowSchema = z.object({
  partnerId: z.string().uuid(),
  partnerName: z.string(),
  sharePercent: z.number(),
  capital: z.string(),
  drawings: z.string(),
  equityShare: z.string(),
  profitShare: z.string(),
  netBalance: z.string(),
});
export type PartnerBalanceRow = z.infer<typeof PartnerBalanceRowSchema>;

export const PartnerBalanceReportSchema = z.object({
  fromJalali: z.string(),
  toJalali: z.string(),
  totalAssets: z.string(),
  totalLiabilities: z.string(),
  netEquity: z.string(),
  sharePercentTotal: z.number(),
  isShareValid: z.boolean(),
  rows: z.array(PartnerBalanceRowSchema),
});
export type PartnerBalanceReport = z.infer<typeof PartnerBalanceReportSchema>;

export const OwnershipSliceSchema = z.object({
  partnerId: z.string().uuid(),
  partnerName: z.string(),
  sharePercent: z.number(),
  amount: z.string(),
  label: z.string(),
});
export type OwnershipSlice = z.infer<typeof OwnershipSliceSchema>;

export const OwnershipDashboardSchema = z.object({
  totalAssets: z.string(),
  totalLiabilities: z.string(),
  netEquity: z.string(),
  sharePercentTotal: z.number(),
  isShareValid: z.boolean(),
  slices: z.array(OwnershipSliceSchema),
});
export type OwnershipDashboard = z.infer<typeof OwnershipDashboardSchema>;

export const CreatePartnerDrawingSchema = z
  .object({
    partnerId: z.string().uuid(),
    dateJalali: JalaliDateStringSchema,    amount: MoneySchema.refine((v) => v > 0n, "مبلغ باید بزرگ‌تر از صفر باشد"),
    description: z.string().max(500).optional().default(""),
    payFrom: ExpensePayFromSchema.default("CASH"),
    cashAccountId: z.string().uuid().optional(),
    bankAccountId: z.string().uuid().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.payFrom === "CASH" && !data.cashAccountId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "حساب صندوق الزامی است",
        path: ["cashAccountId"],
      });
    }
    if (data.payFrom === "BANK" && !data.bankAccountId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "حساب بانکی الزامی است",
        path: ["bankAccountId"],
      });
    }
  });
export type CreatePartnerDrawingInput = z.infer<
  typeof CreatePartnerDrawingSchema
>;

export const PartnerDrawingSchema = z.object({
  id: z.string().uuid(),
  partnerId: z.string().uuid(),
  partnerName: z.string(),
  dateJalali: z.string(),
  amount: z.string(),
  description: z.string(),
  payFrom: ExpensePayFromSchema,
  voucherId: z.string().uuid().nullable(),
  voucherNumber: z.string().nullable().optional(),
});
export type PartnerDrawing = z.infer<typeof PartnerDrawingSchema>;

export const PartnerDrawingListSchema = z.array(PartnerDrawingSchema);
