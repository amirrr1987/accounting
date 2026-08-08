import { Injectable } from "@nestjs/common";
import {
  DashboardSummarySchema,
  balanceToDebitCredit,
  gregorianToJalali,
  netFromMovements,
  todayJalali,
  type DashboardSummary,
} from "@hesabyar/shared";
import { PrismaService } from "../prisma/prisma.service";
import { FiscalYearService } from "../fiscal-year/fiscal-year.service";
import { ReportService } from "../report/report.service";

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fiscalYearService: FiscalYearService,
    private readonly reportService: ReportService,
  ) {}

  async getSummary(): Promise<DashboardSummary> {
    const asOfJalali = todayJalali();
    const fiscalYear = await this.fiscalYearService.ensureDefaultYear();
    const rangeFrom = fiscalYear?.startJalali ?? `${asOfJalali.split("/")[0]}/01/01`;
    const rangeTo = fiscalYear?.endJalali ?? asOfJalali;

    const [
      accountsCount,
      partiesCount,
      productsCount,
      vouchersCount,
      invoicesCount,
      activeInvoicesCount,
      accounts,
      grouped,
      recentVoucherRows,
      recentInvoiceRows,
      charts,
    ] = await Promise.all([
      this.prisma.account.count(),
      this.prisma.party.count({ where: { isActive: true } }),
      this.prisma.product.count({ where: { isActive: true } }),
      this.prisma.voucher.count(),
      this.prisma.invoice.count(),
      this.prisma.invoice.count({ where: { deletedAt: null } }),
      this.prisma.account.findMany({
        select: { id: true, nature: true, level: true },
      }),
      this.prisma.voucherLine.groupBy({
        by: ["accountId"],
        _sum: { debit: true, credit: true },
      }),
      this.prisma.voucher.findMany({
        include: { lines: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      this.prisma.invoice.findMany({
        where: { deletedAt: null },
        include: { party: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      this.reportService.charts(rangeFrom, rangeTo),
    ]);

    const movementByAccount = new Map(
      grouped.map((g) => [
        g.accountId,
        {
          debit: g._sum.debit ?? 0n,
          credit: g._sum.credit ?? 0n,
        },
      ]),
    );

    let totalDebit = 0n;
    let totalCredit = 0n;
    for (const a of accounts) {
      if (a.level !== "DETAIL") continue;
      const mov = movementByAccount.get(a.id) ?? { debit: 0n, credit: 0n };
      const net = netFromMovements(a.nature, mov.debit, mov.credit);
      const cols = balanceToDebitCredit(a.nature, net);
      totalDebit += cols.debit;
      totalCredit += cols.credit;
    }

    return DashboardSummarySchema.parse({
      asOfJalali,
      fiscalYearTitle: fiscalYear?.title ?? null,
      accountsCount,
      partiesCount,
      productsCount,
      vouchersCount,
      invoicesCount,
      activeInvoicesCount,
      totalDebit: totalDebit.toString(),
      totalCredit: totalCredit.toString(),
      isBalanced: totalDebit === totalCredit,
      recentVouchers: recentVoucherRows.map((v) => {
        const totalDebitV = v.lines.reduce((acc, l) => acc + l.debit, 0n);
        return {
          id: v.id,
          number: v.number,
          dateJalali: gregorianToJalali(v.date),
          description: v.description,
          totalDebit: totalDebitV.toString(),
        };
      }),
      recentInvoices: recentInvoiceRows.map((inv) => ({
        id: inv.id,
        number: inv.number,
        kind: inv.kind,
        partyName: inv.party.name,
        dateJalali: gregorianToJalali(inv.date),
        total: inv.total.toString(),
      })),
      charts,
    });
  }
}
