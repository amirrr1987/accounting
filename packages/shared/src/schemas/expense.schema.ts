import { z } from "zod";
import { MoneySchema } from "./voucher.schema";
import { JalaliDateStringSchema } from "./jalali-date.schema";

const jalaliDate = JalaliDateStringSchema;
export const ExpensePayFromSchema = z.enum(["CASH", "BANK"]);
export type ExpensePayFrom = z.infer<typeof ExpensePayFromSchema>;

export const EXPENSE_PAY_FROM_LABELS: Record<ExpensePayFrom, string> = {
  CASH: "صندوق",
  BANK: "حساب بانکی",
};

export const ExpenseCategorySchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  nameFa: z.string(),
  coaAccountCode: z.string(),
  isSystem: z.boolean(),
  isActive: z.boolean(),
});
export type ExpenseCategory = z.infer<typeof ExpenseCategorySchema>;

export const ExpenseCategoryListSchema = z.array(ExpenseCategorySchema);

export const CreateExpenseSchema = z
  .object({
    categoryId: z.string().uuid(),
    dateJalali: jalaliDate,
    amount: MoneySchema.refine((v) => v > 0n, "مبلغ باید بزرگ‌تر از صفر باشد"),
    description: z.string().max(500).optional().default(""),
    payFrom: ExpensePayFromSchema.default("CASH"),
    cashAccountId: z.string().uuid().optional(),
    bankAccountId: z.string().uuid().optional(),
    partyId: z.string().uuid().nullable().optional(),
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
export type CreateExpenseInput = z.infer<typeof CreateExpenseSchema>;

export const ExpenseSchema = z.object({
  id: z.string().uuid(),
  categoryId: z.string().uuid(),
  categoryName: z.string(),
  categoryCode: z.string(),
  dateJalali: z.string(),
  amount: z.string(),
  description: z.string(),
  payFrom: ExpensePayFromSchema,
  partyId: z.string().uuid().nullable(),
  partyName: z.string().nullable().optional(),
  voucherId: z.string().uuid().nullable(),
  voucherNumber: z.string().nullable().optional(),
});
export type Expense = z.infer<typeof ExpenseSchema>;

export const ExpenseListSchema = z.array(ExpenseSchema);

export const ExpenseSummaryQuerySchema = z.object({
  fromJalali: jalaliDate,
  toJalali: jalaliDate,
});
export type ExpenseSummaryQuery = z.infer<typeof ExpenseSummaryQuerySchema>;

export const ExpenseSummaryRowSchema = z.object({
  categoryId: z.string().uuid(),
  categoryCode: z.string(),
  categoryName: z.string(),
  total: z.string(),
  count: z.number().int().nonnegative(),
});
export type ExpenseSummaryRow = z.infer<typeof ExpenseSummaryRowSchema>;

export const ExpenseSummarySchema = z.object({
  fromJalali: z.string(),
  toJalali: z.string(),
  grandTotal: z.string(),
  rows: z.array(ExpenseSummaryRowSchema),
});
export type ExpenseSummary = z.infer<typeof ExpenseSummarySchema>;

export const EXPENSE_POSTING_CODES = {
  cash: "11101",
  ownerDrawing: "33101",
} as const;

export const DEFAULT_EXPENSE_CATEGORIES = [
  { code: "SALARY", nameFa: "حقوق و دستمزد", coaAccountCode: "51101" },
  { code: "RENT", nameFa: "اجاره محل", coaAccountCode: "51102" },
  { code: "UTILITIES", nameFa: "آب، برق و گاز", coaAccountCode: "51103" },
  { code: "WORKER", nameFa: "دستمزد کارگر / پیمانکار", coaAccountCode: "51105" },
  { code: "MISC", nameFa: "هزینه متفرقه", coaAccountCode: "51106" },
] as const;

export const OwnerSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  mobile: z.string().nullable(),
  nationalId: z.string().nullable(),
  isActive: z.boolean(),
});
export type Owner = z.infer<typeof OwnerSchema>;

export const CreateOwnerSchema = z.object({
  name: z.string().min(1).max(200),
  mobile: z.string().max(32).nullable().optional(),
  nationalId: z.string().max(20).nullable().optional(),
  isActive: z.boolean().optional().default(true),
});
export type CreateOwnerInput = z.infer<typeof CreateOwnerSchema>;

export const OwnerListSchema = z.array(OwnerSchema);

export const CreateOwnerDrawingSchema = z
  .object({
    ownerId: z.string().uuid(),
    dateJalali: jalaliDate,
    amount: MoneySchema.refine((v) => v > 0n, "مبلغ باید بزرگ‌تر از صفر باشد"),
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
export type CreateOwnerDrawingInput = z.infer<typeof CreateOwnerDrawingSchema>;

export const OwnerDrawingSchema = z.object({
  id: z.string().uuid(),
  ownerId: z.string().uuid(),
  ownerName: z.string(),
  dateJalali: z.string(),
  amount: z.string(),
  description: z.string(),
  payFrom: ExpensePayFromSchema,
  voucherId: z.string().uuid().nullable(),
  voucherNumber: z.string().nullable().optional(),
});
export type OwnerDrawing = z.infer<typeof OwnerDrawingSchema>;

export const OwnerDrawingListSchema = z.array(OwnerDrawingSchema);
