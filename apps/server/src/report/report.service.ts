import { Injectable, NotFoundException } from "@nestjs/common";
import {
  ACCOUNT_TYPE_LABELS,
  BalanceSheetReportSchema,
  FinancialChartsSchema,
  INVOICE_POSTING_CODES,
  PartyStatementReportSchema,
  ProfitLossReportSchema,
  ReportAsOfQuerySchema,
  ReportRangeQuerySchema,
  VatReportSchema,
  PartyStatementQuerySchema,
  balanceToDebitCredit,
  compareJalali,
  gregorianToJalali,
  isJalaliInRange,
  jalaliMonthKey,
  jalaliMonthLabel,
  jalaliToGregorianDate,
  netFromMovements,
  type BalanceSheetReport,
  type FinancialCharts,
  type PartyStatementQuery,
  type PartyStatementReport,
  type ProfitLossReport,
  type ReportAsOfQuery,
  type ReportRangeQuery,
  type VatReport,
} from "@hesabyar/shared";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ReportService {
  constructor(private readonly prisma: PrismaService) {}

  async profitLoss(query: ReportRangeQuery): Promise<ProfitLossReport> {
    const { fromJalali, toJalali } = ReportRangeQuerySchema.parse(query);
    const from = jalaliToGregorianDate(fromJalali);
    const to = jalaliToGregorianDate(toJalali);

    const accounts = await this.prisma.account.findMany({
      where: {
        level: "DETAIL",
        type: { in: ["INCOME", "EXPENSE"] },
        isActive: true,
      },
      orderBy: { code: "asc" },
    });

    const lines = await this.prisma.voucherLine.findMany({
      where: {
        voucher: { date: { gte: from, lte: to } },
        accountId: { in: accounts.map((a) => a.id) },
      },
      select: { accountId: true, debit: true, credit: true },
    });

    const byAccount = new Map<string, { debit: bigint; credit: bigint }>();
    for (const l of lines) {
      const cur = byAccount.get(l.accountId) ?? { debit: 0n, credit: 0n };
      cur.debit += l.debit;
      cur.credit += l.credit;
      byAccount.set(l.accountId, cur);
    }

    const incomeRows = [];
    const expenseRows = [];
    let incomeTotal = 0n;
    let expenseTotal = 0n;

    for (const a of accounts) {
      const mov = byAccount.get(a.id) ?? { debit: 0n, credit: 0n };
      const net = netFromMovements(a.nature, mov.debit, mov.credit);
      if (net === 0n) continue;

      if (a.type === "INCOME") {
        incomeTotal += net;
        incomeRows.push({
          code: a.code,
          name: a.name,
          amount: net.toString(),
        });
      } else {
        expenseTotal += net;
        expenseRows.push({
          code: a.code,
          name: a.name,
          amount: net.toString(),
        });
      }
    }

    return ProfitLossReportSchema.parse({
      fromJalali,
      toJalali,
      incomeTotal: incomeTotal.toString(),
      expenseTotal: expenseTotal.toString(),
      netProfit: (incomeTotal - expenseTotal).toString(),
      incomeRows,
      expenseRows,
    });
  }

  async balanceSheet(query: ReportAsOfQuery): Promise<BalanceSheetReport> {
    const { asOfJalali } = ReportAsOfQuerySchema.parse(query);
    const asOf = jalaliToGregorianDate(asOfJalali);

    const accounts = await this.prisma.account.findMany({
      where: {
        level: "DETAIL",
        type: { in: ["ASSET", "LIABILITY", "EQUITY"] },
        isActive: true,
      },
      orderBy: { code: "asc" },
    });

    const grouped = await this.prisma.voucherLine.groupBy({
      by: ["accountId"],
      where: {
        accountId: { in: accounts.map((a) => a.id) },
        voucher: { date: { lte: asOf } },
      },
      _sum: { debit: true, credit: true },
    });

    const movementByAccount = new Map(
      grouped.map((g) => [
        g.accountId,
        { debit: g._sum.debit ?? 0n, credit: g._sum.credit ?? 0n },
      ]),
    );

    const sections = [];
    let assets = 0n;
    let liabilities = 0n;
    let equity = 0n;

    for (const type of ["ASSET", "LIABILITY", "EQUITY"] as const) {
      const typeAccounts = accounts.filter((a) => a.type === type);
      const rows = [];
      let sectionTotal = 0n;

      for (const a of typeAccounts) {
        const mov = movementByAccount.get(a.id) ?? { debit: 0n, credit: 0n };
        const net = netFromMovements(a.nature, mov.debit, mov.credit);
        if (net === 0n) continue;
        const cols = balanceToDebitCredit(a.nature, net);
        const amount = cols.debit > 0n ? cols.debit : cols.credit;
        sectionTotal += amount;
        rows.push({ code: a.code, name: a.name, amount: amount.toString() });
      }

      if (type === "ASSET") assets = sectionTotal;
      if (type === "LIABILITY") liabilities = sectionTotal;
      if (type === "EQUITY") equity = sectionTotal;

      sections.push({
        type,
        label: ACCOUNT_TYPE_LABELS[type],
        total: sectionTotal.toString(),
        rows,
      });
    }

    const liabilitiesPlusEquity = liabilities + equity;

    return BalanceSheetReportSchema.parse({
      asOfJalali,
      assets: assets.toString(),
      liabilities: liabilities.toString(),
      equity: equity.toString(),
      liabilitiesPlusEquity: liabilitiesPlusEquity.toString(),
      isBalanced: assets === liabilitiesPlusEquity,
      sections,
    });
  }

  async partyStatement(
    query: PartyStatementQuery,
  ): Promise<PartyStatementReport> {
    const parsed = PartyStatementQuerySchema.parse(query);
    const party = await this.prisma.party.findUnique({
      where: { id: parsed.partyId },
    });
    if (!party) {
      throw new NotFoundException("طرف‌حساب یافت نشد");
    }

    const receivable = await this.prisma.account.findUnique({
      where: { code: INVOICE_POSTING_CODES.receivable },
    });
    const payable = await this.prisma.account.findUnique({
      where: { code: INVOICE_POSTING_CODES.payable },
    });
    const accountIds = [receivable?.id, payable?.id].filter(
      (id): id is string => Boolean(id),
    );

    const allLines = await this.prisma.voucherLine.findMany({
      where: {
        partyId: parsed.partyId,
        accountId: { in: accountIds },
      },
      include: { voucher: true },
      orderBy: [{ voucher: { date: "asc" } }, { lineOrder: "asc" }],
    });

    const nature = party.kind === "CUSTOMER" ? "DEBIT" : "CREDIT";
    let running = 0n;

    const entries = [];
    for (const line of allLines) {
      const dateJalali = gregorianToJalali(line.voucher.date);
      const delta =
        nature === "DEBIT"
          ? line.debit - line.credit
          : line.credit - line.debit;

      if (compareJalali(dateJalali, parsed.fromJalali) < 0) {
        running += delta;
        continue;
      }
      if (compareJalali(dateJalali, parsed.toJalali) > 0) {
        continue;
      }

      running += delta;
      entries.push({
        dateJalali,
        voucherNumber: line.voucher.number,
        description: line.description || line.voucher.description,
        debit: line.debit.toString(),
        credit: line.credit.toString(),
        balance: running.toString(),
      });
    }

    const openingBalance = (() => {
      let open = 0n;
      for (const line of allLines) {
        const dateJalali = gregorianToJalali(line.voucher.date);
        if (compareJalali(dateJalali, parsed.fromJalali) >= 0) break;
        const delta =
          nature === "DEBIT"
            ? line.debit - line.credit
            : line.credit - line.debit;
        open += delta;
      }
      return open;
    })();

    return PartyStatementReportSchema.parse({
      partyId: party.id,
      partyName: party.name,
      fromJalali: parsed.fromJalali,
      toJalali: parsed.toJalali,
      openingBalance: openingBalance.toString(),
      closingBalance: running.toString(),
      entries,
    });
  }

  async charts(fromJalali: string, toJalali: string): Promise<FinancialCharts> {
    const invoices = await this.prisma.invoice.findMany({
      where: { deletedAt: null },
      select: { kind: true, total: true, date: true },
    });

    const vouchers = await this.prisma.voucher.findMany({
      where: { kind: { in: ["RECEIPT", "PAYMENT"] } },
      select: { kind: true, date: true, lines: { select: { debit: true } } },
    });

    const monthMap = new Map<
      string,
      { sales: bigint; purchases: bigint; receipts: bigint; payments: bigint }
    >();

    const ensure = (key: string) => {
      if (!monthMap.has(key)) {
        monthMap.set(key, {
          sales: 0n,
          purchases: 0n,
          receipts: 0n,
          payments: 0n,
        });
      }
      return monthMap.get(key)!;
    };

    for (const inv of invoices) {
      const jalali = gregorianToJalali(inv.date);
      if (!isJalaliInRange(jalali, fromJalali, toJalali)) continue;
      const key = jalaliMonthKey(jalali);
      const bucket = ensure(key);
      if (inv.kind === "SALE") bucket.sales += inv.total;
      else bucket.purchases += inv.total;
    }

    for (const v of vouchers) {
      const jalali = gregorianToJalali(v.date);
      if (!isJalaliInRange(jalali, fromJalali, toJalali)) continue;
      const key = jalaliMonthKey(jalali);
      const bucket = ensure(key);
      const amount = v.lines.reduce((a, l) => a + l.debit, 0n);
      if (v.kind === "RECEIPT") bucket.receipts += amount;
      else bucket.payments += amount;
    }

    const monthlyTrend = [...monthMap.entries()]
      .sort(([a], [b]) => compareJalali(`${a}/01`, `${b}/01`))
      .map(([monthKey, v]) => ({
        monthKey,
        monthLabel: jalaliMonthLabel(monthKey),
        sales: v.sales.toString(),
        purchases: v.purchases.toString(),
        receipts: v.receipts.toString(),
        payments: v.payments.toString(),
      }));

    const accounts = await this.prisma.account.findMany({
      where: { level: "DETAIL", isActive: true },
    });
    const grouped = await this.prisma.voucherLine.groupBy({
      by: ["accountId"],
      _sum: { debit: true, credit: true },
    });
    const movementByAccount = new Map(
      grouped.map((g) => [
        g.accountId,
        { debit: g._sum.debit ?? 0n, credit: g._sum.credit ?? 0n },
      ]),
    );

    const typeTotals = new Map<string, bigint>();
    for (const a of accounts) {
      const mov = movementByAccount.get(a.id) ?? { debit: 0n, credit: 0n };
      const net = netFromMovements(a.nature, mov.debit, mov.credit);
      const cols = balanceToDebitCredit(a.nature, net);
      const amount = cols.debit + cols.credit;
      typeTotals.set(a.type, (typeTotals.get(a.type) ?? 0n) + amount);
    }

    const accountTypeMix = (
      ["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"] as const
    ).map((type) => ({
      type,
      label: ACCOUNT_TYPE_LABELS[type],
      amount: (typeTotals.get(type) ?? 0n).toString(),
    }));

    const arAp = await this.arApBalances();

    return FinancialChartsSchema.parse({
      monthlyTrend,
      accountTypeMix,
      arAp,
    });
  }

  private async arApBalances(): Promise<{ receivable: string; payable: string }> {
    const receivable = await this.prisma.account.findUnique({
      where: { code: INVOICE_POSTING_CODES.receivable },
    });
    const payable = await this.prisma.account.findUnique({
      where: { code: INVOICE_POSTING_CODES.payable },
    });

    const sumNet = async (accountId: string | undefined, nature: "DEBIT" | "CREDIT") => {
      if (!accountId) return 0n;
      const g = await this.prisma.voucherLine.groupBy({
        by: ["accountId"],
        where: { accountId },
        _sum: { debit: true, credit: true },
      });
      const mov = g[0];
      if (!mov) return 0n;
      const net = netFromMovements(
        nature,
        mov._sum.debit ?? 0n,
        mov._sum.credit ?? 0n,
      );
      const cols = balanceToDebitCredit(nature, net);
      return cols.debit > 0n ? cols.debit : cols.credit;
    };

    const [ar, ap] = await Promise.all([
      sumNet(receivable?.id, "DEBIT"),
      sumNet(payable?.id, "CREDIT"),
    ]);

    return { receivable: ar.toString(), payable: ap.toString() };
  }

  async vatReport(query: ReportRangeQuery): Promise<VatReport> {
    const { fromJalali, toJalali } = ReportRangeQuerySchema.parse(query);
    const from = jalaliToGregorianDate(fromJalali);
    const to = jalaliToGregorianDate(toJalali);

    const invoices = await this.prisma.invoice.findMany({
      where: {
        deletedAt: null,
        date: { gte: from, lte: to },
      },
      include: { party: true },
      orderBy: [{ date: "asc" }, { number: "asc" }],
    });

    let outputVat = 0n;
    let inputVat = 0n;
    const sales = [];
    const purchases = [];

    for (const inv of invoices) {
      const row = {
        dateJalali: gregorianToJalali(inv.date),
        invoiceNumber: inv.number,
        partyName: inv.party.name,
        taxableAmount: inv.subtotal.toString(),
        vatAmount: inv.vatAmount.toString(),
        total: inv.total.toString(),
      };

      if (inv.kind === "SALE") {
        outputVat += inv.vatAmount;
        sales.push(row);
      } else {
        inputVat += inv.vatAmount;
        purchases.push(row);
      }
    }

    return VatReportSchema.parse({
      fromJalali,
      toJalali,
      outputVat: outputVat.toString(),
      inputVat: inputVat.toString(),
      netPayable: (outputVat - inputVat).toString(),
      sales,
      purchases,
    });
  }
}
