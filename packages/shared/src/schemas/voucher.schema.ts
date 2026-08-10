import { z } from "zod";
import { JalaliDateStringSchema } from "./jalali-date.schema";

/**
 * مبلغ به ریال (کوچک‌ترین واحد) — در API به صورت رشته ارسال می‌شود
 * تا از دست رفتن دقت BigInt در JSON جلوگیری شود.
 */
export const MoneySchema = z
  .union([
    z.bigint(),
    z
      .string()
      .regex(/^\d+$/, "مبلغ باید عدد صحیح غیرمنفی باشد")
      .transform((v) => BigInt(v)),
    z
      .number()
      .int()
      .nonnegative()
      .transform((v) => BigInt(v)),
  ])
  .pipe(z.bigint().nonnegative());

export type Money = z.infer<typeof MoneySchema>;

const moneyField = z.preprocess(
  (v) => (v === undefined || v === null || v === "" ? "0" : v),
  MoneySchema,
);

/** ردیف سند: یا بدهکار یا بستانکار — هر دو همزمان مجاز نیست */
export const VoucherLineInputSchema = z
  .object({
    accountId: z.string().uuid(),
    partyId: z.string().uuid().optional(),
    description: z.string().max(500).optional().default(""),
    debit: moneyField,
    credit: moneyField,
  })
  .superRefine((line, ctx) => {
    // یک طرف باید صفر باشد (debit * credit === 0)
    if (line.debit > 0n && line.credit > 0n) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "هر ردیف فقط می‌تواند بدهکار یا بستانکار باشد",
        path: ["debit"],
      });
    }
    if (line.debit === 0n && line.credit === 0n) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "مبلغ بدهکار یا بستانکار الزامی است",
        path: ["debit"],
      });
    }
  });

export type VoucherLineInput = z.infer<typeof VoucherLineInputSchema>;

export const VoucherKindSchema = z.enum([
  "GENERAL",
  "RECEIPT",
  "PAYMENT",
  "INVOICE",
  "REVERSAL",
]);
export type VoucherKind = z.infer<typeof VoucherKindSchema>;

export const VoucherLineSchema = z.object({
  id: z.string().uuid(),
  accountId: z.string().uuid(),
  partyId: z.string().uuid().nullable().optional(),
  description: z.string(),
  debit: z.string(),
  credit: z.string(),
  lineOrder: z.number().int().nonnegative(),
});

export type VoucherLine = z.infer<typeof VoucherLineSchema>;

/**
 * جمع بدهکار === جمع بستانکار
 * معادله حسابداری در سطح سند
 */
export function sumDebit(lines: { debit: bigint }[]): bigint {
  return lines.reduce((acc, l) => acc + l.debit, 0n);
}

export function sumCredit(lines: { credit: bigint }[]): bigint {
  return lines.reduce((acc, l) => acc + l.credit, 0n);
}

export function isBalanced(
  lines: { debit: bigint; credit: bigint }[],
): boolean {
  return lines.length >= 2 && sumDebit(lines) === sumCredit(lines);
}

export const CreateVoucherSchema = z
  .object({
    /** تاریخ شمسی کسب‌وکار — در DB به‌صورت DATE میلادی ذخیره می‌شود */
    dateJalali: JalaliDateStringSchema,    description: z.string().min(1).max(1000),
    lines: z.array(VoucherLineInputSchema).min(2, "حداقل دو ردیف الزامی است"),
  })
  .superRefine((voucher, ctx) => {
    const debit = sumDebit(voucher.lines);
    const credit = sumCredit(voucher.lines);
    if (debit !== credit) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `سند تراز نیست: بدهکار ${debit.toString()} ≠ بستانکار ${credit.toString()}`,
        path: ["lines"],
      });
    }
  });

export type CreateVoucherInput = z.infer<typeof CreateVoucherSchema>;

export const VoucherSchema = z.object({
  id: z.string().uuid(),
  /** شماره سند با پیشوند فارسی، مثل سند-۰۰۰۱ */
  number: z.string().min(1),
  kind: VoucherKindSchema.default("GENERAL"),
  dateJalali: z.string(),
  dateGregorian: z.string(),
  description: z.string(),
  lines: z.array(VoucherLineSchema),
  totalDebit: z.string(),
  totalCredit: z.string(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export type Voucher = z.infer<typeof VoucherSchema>;

export const VoucherListSchema = z.array(VoucherSchema);
export type VoucherList = z.infer<typeof VoucherListSchema>;

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

export function toPersianDigits(value: string): string {
  return value.replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)] ?? d);
}

/** قالب شماره سند فارسی: سند-۰۰۰۱ */
export function formatVoucherNumber(seq: number): string {
  return `سند-${toPersianDigits(String(seq).padStart(4, "0"))}`;
}

export function formatReceiptNumber(seq: number): string {
  return `دریافت-${toPersianDigits(String(seq).padStart(4, "0"))}`;
}

export function formatPaymentNumber(seq: number): string {
  return `پرداخت-${toPersianDigits(String(seq).padStart(4, "0"))}`;
}
