import { z } from "zod";
import { MoneySchema } from "./voucher.schema";

const jalaliDate = z
  .string()
  .regex(/^\d{4}\/\d{2}\/\d{2}$/, "فرمت تاریخ باید YYYY/MM/DD شمسی باشد");

export const sayyadNumberSchema = z
  .string()
  .regex(/^\d{16}$/, "شماره صیاد باید ۱۶ رقم باشد");

export const nationalIdSchema = z
  .string()
  .regex(/^\d{10}$/, "کد ملی باید ۱۰ رقم باشد");

export const mobileSchema = z
  .string()
  .regex(/^09\d{9}$/, "شماره موبایل باید با ۰۹ شروع و ۱۱ رقم باشد");

export const CheckKindSchema = z.enum(["RECEIVABLE", "PAYABLE"]);
export type CheckKind = z.infer<typeof CheckKindSchema>;

export const CHECK_KIND_LABELS: Record<CheckKind, string> = {
  RECEIVABLE: "چک دریافتی",
  PAYABLE: "چک پرداختی",
};

export const CheckStatusSchema = z.enum([
  "IN_PORTFOLIO",
  "DEPOSITED",
  "CLEARED",
  "RETURNED",
  "ENDORSED",
  "PAID",
]);
export type CheckStatus = z.infer<typeof CheckStatusSchema>;

export const CHECK_STATUS_LABELS: Record<CheckStatus, string> = {
  IN_PORTFOLIO: "نزد صندوق",
  DEPOSITED: "واگذار به بانک",
  CLEARED: "وصول‌شده",
  RETURNED: "برگشتی",
  ENDORSED: "واگذار به غیر",
  PAID: "پرداخت‌شده",
};

export const CheckDetailsSchema = z.object({
  sayyadNumber: sayyadNumberSchema,
  issueJalali: jalaliDate,
  dueJalali: jalaliDate,
  drawerNationalId: nationalIdSchema,
  drawerMobile: mobileSchema,
  bankName: z.string().min(1).max(200),
  branchCode: z.string().max(32).nullable().optional(),
  accountNumber: z.string().max(64).nullable().optional(),
});

function refineCheckDates<T extends { issueJalali: string; dueJalali: string }>(
  data: T,
  ctx: z.RefinementCtx,
): void {
  if (data.dueJalali < data.issueJalali) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "تاریخ سررسید نباید قبل از تاریخ صدور باشد",
      path: ["dueJalali"],
    });
  }
}

export type CheckDetails = z.infer<typeof CheckDetailsSchema>;

export const CreateCheckSchema = z
  .object({
    kind: CheckKindSchema,
    partyId: z.string().uuid(),
    amount: MoneySchema.refine((v) => v > 0n, "مبلغ چک باید بزرگ‌تر از صفر باشد"),
    dateJalali: jalaliDate,
    description: z.string().max(500).optional(),
    bankAccountId: z.string().uuid().nullable().optional(),
  })
  .merge(CheckDetailsSchema)
  .superRefine(refineCheckDates);
export type CreateCheckInput = z.infer<typeof CreateCheckSchema>;

/** برای دریافت/پرداخت — فقط جزئیات چک */
export const PaymentCheckDetailsSchema = CheckDetailsSchema.superRefine(
  refineCheckDates,
);

export const UpdateCheckStatusSchema = z.object({
  status: CheckStatusSchema,
  dateJalali: jalaliDate,
  note: z.string().max(500).optional(),
  bankAccountId: z.string().uuid().optional(),
});
export type UpdateCheckStatusInput = z.infer<typeof UpdateCheckStatusSchema>;

export const CheckEventSchema = z.object({
  id: z.string().uuid(),
  status: CheckStatusSchema,
  dateJalali: z.string(),
  note: z.string().nullable(),
  voucherId: z.string().uuid().nullable(),
  voucherNumber: z.string().nullable().optional(),
});
export type CheckEvent = z.infer<typeof CheckEventSchema>;

export const CheckSchema = z.object({
  id: z.string().uuid(),
  kind: CheckKindSchema,
  sayyadNumber: z.string(),
  issueJalali: z.string(),
  dueJalali: z.string(),
  amount: z.string(),
  partyId: z.string().uuid(),
  partyName: z.string(),
  drawerNationalId: z.string(),
  drawerMobile: z.string(),
  bankName: z.string(),
  branchCode: z.string().nullable(),
  accountNumber: z.string().nullable(),
  status: CheckStatusSchema,
  receiptVoucherId: z.string().uuid().nullable(),
  receiptVoucherNumber: z.string().nullable().optional(),
  bankAccountId: z.string().uuid().nullable(),
  bankAccountName: z.string().nullable().optional(),
  events: z.array(CheckEventSchema).optional(),
});
export type Check = z.infer<typeof CheckSchema>;

export const CheckListSchema = z.array(CheckSchema);

export const CheckQuerySchema = z.object({
  status: CheckStatusSchema.optional(),
  kind: CheckKindSchema.optional(),
  dueFromJalali: jalaliDate.optional(),
  dueToJalali: jalaliDate.optional(),
});
export type CheckQuery = z.infer<typeof CheckQuerySchema>;

export const CheckSummarySchema = z.object({
  total: z.number().int().nonnegative(),
  byStatus: z.object({
    IN_PORTFOLIO: z.number().int().nonnegative(),
    DEPOSITED: z.number().int().nonnegative(),
    CLEARED: z.number().int().nonnegative(),
    RETURNED: z.number().int().nonnegative(),
    ENDORSED: z.number().int().nonnegative(),
    PAID: z.number().int().nonnegative(),
  }),
  dueThisWeek: z.number().int().nonnegative(),
  overdue: z.number().int().nonnegative(),
});
export type CheckSummary = z.infer<typeof CheckSummarySchema>;

export const CHECK_POSTING_CODES = {
  receivable: "11201",
  payable: "21101",
  checksReceivable: "11202",
  checksPayable: "21102",
  checksInCollection: "11203",
} as const;

/** انتقال‌های مجاز وضعیت چک */
export const CHECK_STATUS_TRANSITIONS: Record<
  CheckKind,
  Partial<Record<CheckStatus, CheckStatus[]>>
> = {
  RECEIVABLE: {
    IN_PORTFOLIO: ["DEPOSITED", "RETURNED"],
    DEPOSITED: ["CLEARED", "RETURNED"],
    CLEARED: [],
    RETURNED: [],
    ENDORSED: [],
    PAID: [],
  },
  PAYABLE: {
    IN_PORTFOLIO: ["PAID", "RETURNED"],
    PAID: [],
    RETURNED: [],
    DEPOSITED: [],
    CLEARED: [],
    ENDORSED: [],
  },
};

export function assertCheckStatusTransition(
  kind: CheckKind,
  from: CheckStatus,
  to: CheckStatus,
): void {
  const allowed = CHECK_STATUS_TRANSITIONS[kind][from] ?? [];
  if (!allowed.includes(to)) {
    throw new Error(
      `انتقال وضعیت از ${CHECK_STATUS_LABELS[from]} به ${CHECK_STATUS_LABELS[to]} مجاز نیست`,
    );
  }
}
