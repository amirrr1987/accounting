import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  LedgerQuerySchema,
  LedgerReportSchema,
  gregorianToJalali,
  jalaliToGregorianDate,
  movementDelta,
  withRunningBalance,
  type LedgerQuery,
  type LedgerReport,
} from "@hesabyar/shared";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async getReport(raw: LedgerQuery): Promise<LedgerReport> {
    const query = LedgerQuerySchema.parse(raw);

    const account = await this.prisma.account.findUnique({
      where: { id: query.accountId },
    });
    if (!account) {
      throw new NotFoundException("حساب یافت نشد");
    }

    const fromDate = query.fromJalali
      ? jalaliToGregorianDate(query.fromJalali)
      : null;
    const toDate = query.toJalali
      ? jalaliToGregorianDate(query.toJalali)
      : null;

    if (fromDate && toDate && fromDate > toDate) {
      throw new BadRequestException("بازه تاریخ نامعتبر است");
    }

    // مانده اول دوره: حرکات strictly قبل از from (بدون off-by-one)
    const openingLines = fromDate
      ? await this.prisma.voucherLine.findMany({
          where: { accountId: account.id, voucher: { date: { lt: fromDate } } },
          select: { debit: true, credit: true },
        })
      : [];

    const openingBalance = openingLines.reduce(
      (acc, line) =>
        acc + movementDelta(account.nature, line.debit, line.credit),
      0n,
    );

    // بازه شامل هر دو سر: date >= from AND date <= to
    const periodFilter: Prisma.DateTimeFilter = {};
    if (fromDate) periodFilter.gte = fromDate;
    if (toDate) periodFilter.lte = toDate;

    const lines = await this.prisma.voucherLine.findMany({
      where: {
        accountId: account.id,
        ...(Object.keys(periodFilter).length > 0
          ? { voucher: { date: periodFilter } }
          : {}),
      },
      include: { voucher: true },
      orderBy: [
        { voucher: { date: "asc" } },
        { voucher: { number: "asc" } },
        { lineOrder: "asc" },
      ],
    });

    const withBalance = withRunningBalance(
      account.nature,
      openingBalance,
      lines.map((l) => ({
        id: l.id,
        debit: l.debit,
        credit: l.credit,
        description: l.description || l.voucher.description,
        voucherId: l.voucherId,
        voucherNumber: l.voucher.number,
        date: l.voucher.date,
      })),
    );

    const totalDebit = lines.reduce((a, l) => a + l.debit, 0n);
    const totalCredit = lines.reduce((a, l) => a + l.credit, 0n);
    const closingBalance =
      withBalance.length > 0
        ? withBalance[withBalance.length - 1].balance
        : openingBalance;

    return LedgerReportSchema.parse({
      account: {
        id: account.id,
        code: account.code,
        name: account.name,
        type: account.type,
        nature: account.nature,
        level: account.level,
      },
      fromJalali: query.fromJalali ?? null,
      toJalali: query.toJalali ?? null,
      openingBalance: openingBalance.toString(),
      closingBalance: closingBalance.toString(),
      totalDebit: totalDebit.toString(),
      totalCredit: totalCredit.toString(),
      entries: withBalance.map((e) => ({
        id: e.id,
        dateJalali: gregorianToJalali(e.date),
        dateGregorian: e.date.toISOString().slice(0, 10),
        voucherId: e.voucherId,
        voucherNumber: e.voucherNumber,
        description: e.description,
        debit: e.debit.toString(),
        credit: e.credit.toString(),
        balance: e.balance.toString(),
      })),
    });
  }
}
