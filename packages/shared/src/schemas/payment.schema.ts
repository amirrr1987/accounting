import { z } from "zod";
import { MoneySchema } from "./voucher.schema";

const jalaliDate = z
  .string()
  .regex(/^\d{4}\/\d{2}\/\d{2}$/, "فرمت تاریخ باید YYYY/MM/DD شمسی باشد");

/** سند دریافت: بدهکار نقد/بانک — بستانکار دریافتنی */
export const CreateReceiptSchema = z.object({
  dateJalali: jalaliDate,
  partyId: z.string().uuid(),
  amount: MoneySchema.refine((v) => v > 0n, "مبلغ دریافت باید بزرگ‌تر از صفر باشد"),
  cashAccountId: z.string().uuid(),
  description: z.string().max(500).optional(),
});
export type CreateReceiptInput = z.infer<typeof CreateReceiptSchema>;

/** سند پرداخت: بدهکار پرداختنی — بستانکار نقد/بانک */
export const CreatePaymentSchema = z.object({
  dateJalali: jalaliDate,
  partyId: z.string().uuid(),
  amount: MoneySchema.refine((v) => v > 0n, "مبلغ پرداخت باید بزرگ‌تر از صفر باشد"),
  cashAccountId: z.string().uuid(),
  description: z.string().max(500).optional(),
});
export type CreatePaymentInput = z.infer<typeof CreatePaymentSchema>;

export const PAYMENT_POSTING_CODES = {
  receivable: "11201",
  payable: "21101",
  cash: "11101",
  bank: "11103",
} as const;

export const CASH_ACCOUNT_CODES = [
  PAYMENT_POSTING_CODES.cash,
  PAYMENT_POSTING_CODES.bank,
] as const;
