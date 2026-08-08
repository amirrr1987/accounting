import { Injectable } from "@nestjs/common";
import {
  TrialBalanceQuerySchema,
  TrialBalanceReportSchema,
  balanceToDebitCredit,
  buildTrialBalanceTree,
  jalaliToGregorianDate,
  netFromMovements,
  sumDetailColumns,
  type TrialBalanceQuery,
  type TrialBalanceReport,
} from "@hesabyar/shared";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class TrialBalanceService {
  constructor(private readonly prisma: PrismaService) {}

  async getReport(raw: TrialBalanceQuery): Promise<TrialBalanceReport> {
    const query = TrialBalanceQuerySchema.parse(raw);
    const asOf = jalaliToGregorianDate(query.asOfJalali);

    const accounts = await this.prisma.account.findMany({
      orderBy: { code: "asc" },
    });

    // یک بار تجمیع همه ردیف‌ها تا تاریخ مقطع — مناسب برای حجم بالا
    const grouped = await this.prisma.voucherLine.groupBy({
      by: ["accountId"],
      where: {
        voucher: { date: { lte: asOf } },
      },
      _sum: {
        debit: true,
        credit: true,
      },
    });

    const movementByAccount = new Map(
      grouped.map((g) => [
        g.accountId,
        {
          debit: g._sum.debit ?? 0n,
          credit: g._sum.credit ?? 0n,
        },
      ]),
    );

    const flat = accounts.map((a) => {
      const mov = movementByAccount.get(a.id) ?? { debit: 0n, credit: 0n };
      const net = netFromMovements(a.nature, mov.debit, mov.credit);
      const cols = balanceToDebitCredit(a.nature, net);
      return {
        id: a.id,
        code: a.code,
        name: a.name,
        level: a.level,
        type: a.type,
        nature: a.nature,
        parentId: a.parentId,
        debit: cols.debit,
        credit: cols.credit,
      };
    });

    const { totalDebit, totalCredit } = sumDetailColumns(flat);
    const tree = buildTrialBalanceTree(flat);

    return TrialBalanceReportSchema.parse({
      asOfJalali: query.asOfJalali,
      asOfGregorian: asOf.toISOString().slice(0, 10),
      generatedAt: new Date().toISOString(),
      totalDebit: totalDebit.toString(),
      totalCredit: totalCredit.toString(),
      isBalanced: totalDebit === totalCredit,
      tree,
    });
  }
}
