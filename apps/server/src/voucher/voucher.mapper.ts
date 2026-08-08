import type { Account, Voucher, VoucherLine as PrismaLine } from "@prisma/client";
import {
  VoucherSchema,
  gregorianToJalali,
  type Voucher as VoucherDto,
} from "@hesabyar/shared";

type LineWithAccount = PrismaLine & { account?: Account };

export function toVoucherDto(
  voucher: Voucher & { lines: LineWithAccount[] },
): VoucherDto {
  const lines = [...voucher.lines].sort((a, b) => a.lineOrder - b.lineOrder);
  const totalDebit = lines.reduce((acc, l) => acc + l.debit, 0n);
  const totalCredit = lines.reduce((acc, l) => acc + l.credit, 0n);

  return VoucherSchema.parse({
    id: voucher.id,
    number: voucher.number,
    kind: voucher.kind,
    dateJalali: gregorianToJalali(voucher.date),
    dateGregorian: voucher.date.toISOString().slice(0, 10),
    description: voucher.description,
    lines: lines.map((l) => ({
      id: l.id,
      accountId: l.accountId,
      partyId: l.partyId,
      description: l.description,
      debit: l.debit.toString(),
      credit: l.credit.toString(),
      lineOrder: l.lineOrder,
    })),
    totalDebit: totalDebit.toString(),
    totalCredit: totalCredit.toString(),
    createdAt: voucher.createdAt.toISOString(),
    updatedAt: voucher.updatedAt.toISOString(),
  });
}
