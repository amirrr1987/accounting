import { z } from "zod";
import { AccountNatureSchema, AccountSchema } from "./account.schema";
import { JalaliDateStringSchema } from "./jalali-date.schema";

export const LedgerQuerySchema = z.object({
  accountId: z.string().uuid(),
  /** تاریخ شروع شمسی — شامل خود روز */
  fromJalali: JalaliDateStringSchema.optional(),
  /** تاریخ پایان شمسی — شامل خود روز */
  toJalali: JalaliDateStringSchema.optional(),
});

export type LedgerQuery = z.infer<typeof LedgerQuerySchema>;

export const LedgerEntrySchema = z.object({
  id: z.string().uuid(),
  dateJalali: z.string(),
  dateGregorian: z.string(),
  voucherId: z.string().uuid(),
  voucherNumber: z.string(),
  description: z.string(),
  debit: z.string(),
  credit: z.string(),
  /** مانده پس از این ردیف */
  balance: z.string(),
});

export type LedgerEntry = z.infer<typeof LedgerEntrySchema>;

export const LedgerReportSchema = z.object({
  account: AccountSchema.pick({
    id: true,
    code: true,
    name: true,
    type: true,
    nature: true,
    level: true,
  }),
  fromJalali: z.string().nullable(),
  toJalali: z.string().nullable(),
  openingBalance: z.string(),
  closingBalance: z.string(),
  totalDebit: z.string(),
  totalCredit: z.string(),
  entries: z.array(LedgerEntrySchema),
});

export type LedgerReport = z.infer<typeof LedgerReportSchema>;

/**
 * تأثیر مبلغ روی مانده با توجه به ماهیت حساب
 * بدهکار (دارایی/هزینه): بدهکار + و بستانکار −
 * بستانکار (بدهی/حقوق/درآمد): بستانکار + و بدهکار −
 */
export function movementDelta(
  nature: z.infer<typeof AccountNatureSchema>,
  debit: bigint,
  credit: bigint,
): bigint {
  if (nature === "DEBIT") {
    return debit - credit;
  }
  return credit - debit;
}

/** محاسبه مانده‌های متوالی از مانده ابتدای دوره */
export function withRunningBalance<
  T extends { debit: bigint; credit: bigint },
>(
  nature: z.infer<typeof AccountNatureSchema>,
  opening: bigint,
  rows: T[],
): Array<T & { balance: bigint }> {
  let balance = opening;
  return rows.map((row) => {
    balance += movementDelta(nature, row.debit, row.credit);
    return { ...row, balance };
  });
}
