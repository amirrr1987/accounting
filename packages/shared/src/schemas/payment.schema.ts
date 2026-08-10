import { z } from "zod";
import { MoneySchema } from "./voucher.schema";
import { PaymentCheckDetailsSchema } from "./check.schema";
import { JalaliDateStringSchema } from "./jalali-date.schema";

const jalaliDate = JalaliDateStringSchema;
export const PaymentMethodSchema = z.enum([
  "CASH",
  "CHECK_PAYABLE",
  "CHECK_RECEIVABLE",
]);
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "نقدی / بانک",
  CHECK_PAYABLE: "چک پرداختی (خرید)",
  CHECK_RECEIVABLE: "چک دریافتی (فروش)",
};

const receiptBase = {
  dateJalali: jalaliDate,
  partyId: z.string().uuid(),
  amount: MoneySchema.refine((v) => v > 0n, "مبلغ دریافت باید بزرگ‌تر از صفر باشد"),
  description: z.string().max(500).optional(),
};

export const CreateReceiptSchema = z
  .object({
    ...receiptBase,
    method: z.enum(["CASH", "CHECK_RECEIVABLE"]).default("CASH"),
    cashAccountId: z.string().uuid().optional(),
    bankAccountId: z.string().uuid().optional(),
    check: PaymentCheckDetailsSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.method === "CASH" && !data.cashAccountId && !data.bankAccountId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "حساب نقد/بانک الزامی است",
        path: ["cashAccountId"],
      });
    }
    if (data.method === "CHECK_RECEIVABLE" && !data.check) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "اطلاعات چک صیادی الزامی است",
        path: ["check"],
      });
    }
  });
export type CreateReceiptInput = z.infer<typeof CreateReceiptSchema>;

export const CreatePaymentSchema = z
  .object({
    dateJalali: jalaliDate,
    partyId: z.string().uuid(),
    amount: MoneySchema.refine((v) => v > 0n, "مبلغ پرداخت باید بزرگ‌تر از صفر باشد"),
    description: z.string().max(500).optional(),
    method: z.enum(["CASH", "CHECK_PAYABLE"]).default("CASH"),
    cashAccountId: z.string().uuid().optional(),
    bankAccountId: z.string().uuid().optional(),
    check: PaymentCheckDetailsSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.method === "CASH" && !data.cashAccountId && !data.bankAccountId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "حساب نقد/بانک الزامی است",
        path: ["cashAccountId"],
      });
    }
    if (data.method === "CHECK_PAYABLE" && !data.check) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "اطلاعات چک صیادی الزامی است",
        path: ["check"],
      });
    }
  });
export type CreatePaymentInput = z.infer<typeof CreatePaymentSchema>;

export const PAYMENT_POSTING_CODES = {
  receivable: "11201",
  payable: "21101",
  cash: "11101",
  bank: "11103",
  checksReceivable: "11202",
  checksPayable: "21102",
} as const;

export const CASH_ACCOUNT_CODES = [
  PAYMENT_POSTING_CODES.cash,
  PAYMENT_POSTING_CODES.bank,
] as const;
