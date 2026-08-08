import { Injectable, NotFoundException } from "@nestjs/common";
import {
  ACCOUNT_TYPE_LABELS,
  BalanceSheetReportSchema,
  CashFlowReportSchema,
  CheckReportSchema,
  CHECK_POSTING_CODES,
  CHECK_STATUS_LABELS,
  DashboardManagementSchema,
  FinancialChartsSchema,
  INVOICE_POSTING_CODES,
  InventoryKardexQuerySchema,
  InventoryKardexReportSchema,
  LOW_STOCK_THRESHOLD,
  OwnerStatusReportSchema,
  PartyStatementReportSchema,
  ProfitLossReportSchema,
  ReportAsOfQuerySchema,
  ReportRangeQuerySchema,
  VatReportSchema,
  PartyStatementQuerySchema,
  PAYMENT_POSTING_CODES,
  balanceToDebitCredit,
  compareJalali,
  gregorianToJalali,
  isJalaliInRange,
  jalaliMonthKey,
  jalaliMonthLabel,
  jalaliToGregorianDate,
  netFromMovements,
  type BalanceSheetReport,
  type CashFlowReport,
  type CheckReport,
  type DashboardManagement,
  type FinancialCharts,
  type InventoryKardexQuery,
  type InventoryKardexReport,
  type OwnerStatusReport,
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

  async managementKpis(
    fromJalali: string,
    toJalali: string,
    asOfJalali: string,
  ): Promise<DashboardManagement> {
    const asOf = jalaliToGregorianDate(asOfJalali);
    const from = jalaliToGregorianDate(fromJalali);
    const to = jalaliToGregorianDate(toJalali);

    const weekLater = new Date(asOf);
    weekLater.setDate(weekLater.getDate() + 7);

    const [
      cashBal,
      bankBal,
      inventoryBal,
      checksBal,
      lowStockProducts,
      saleLoss,
      ownerDrawings,
      checksDueThisWeek,
      checksOverdue,
    ] = await Promise.all([
      this.accountBalanceByCode(PAYMENT_POSTING_CODES.cash, asOf),
      this.totalBankBalance(asOf),
      this.accountBalanceByCode(INVOICE_POSTING_CODES.inventory, asOf),
      this.totalChecksBalance(asOf),
      this.prisma.product.findMany({
        where: {
          isActive: true,
          stockQty: { lte: LOW_STOCK_THRESHOLD },
        },
        orderBy: { stockQty: "asc" },
        take: 10,
        select: { id: true, name: true, sku: true, stockQty: true },
      }),
      this.periodAccountNet("51202", from, to),
      this.prisma.ownerDrawing.aggregate({
        where: { date: { gte: from, lte: to } },
        _sum: { amount: true },
      }),
      this.prisma.check.count({
        where: {
          dueDate: { gte: asOf, lte: weekLater },
          status: { in: ["IN_PORTFOLIO", "DEPOSITED"] },
        },
      }),
      this.prisma.check.count({
        where: {
          dueDate: { lt: asOf },
          status: { in: ["IN_PORTFOLIO", "DEPOSITED"] },
        },
      }),
    ]);

    const inventory =
      inventoryBal > 0n ? inventoryBal : await this.inventoryFromProducts();

    const grandTotal = cashBal + bankBal + inventory + checksBal;

    return DashboardManagementSchema.parse({
      totalCash: cashBal.toString(),
      totalBank: bankBal.toString(),
      totalInventory: inventory.toString(),
      totalChecks: checksBal.toString(),
      grandTotal: grandTotal.toString(),
      checksDueThisWeek,
      checksOverdue,
      lowStockCount: lowStockProducts.length,
      lowStockProducts,
      periodSaleLoss: saleLoss.toString(),
      periodOwnerDrawings: (ownerDrawings._sum.amount ?? 0n).toString(),
    });
  }

  async cashFlow(query: ReportRangeQuery): Promise<CashFlowReport> {
    const { fromJalali, toJalali } = ReportRangeQuerySchema.parse(query);
    const from = jalaliToGregorianDate(fromJalali);
    const to = jalaliToGregorianDate(toJalali);
    const cashAccountIds = await this.liquidAccountIds();

    const dayBeforeFrom = new Date(from);
    dayBeforeFrom.setDate(dayBeforeFrom.getDate() - 1);

    const openingBalance = await this.sumLiquidBalance(
      cashAccountIds,
      dayBeforeFrom,
    );

    const lines = await this.prisma.voucherLine.findMany({
      where: {
        accountId: { in: cashAccountIds },
        voucher: { date: { gte: from, lte: to } },
      },
      include: { voucher: true, account: true },
      orderBy: [{ voucher: { date: "asc" } }, { lineOrder: "asc" }],
    });

    let running = openingBalance;
    let totalInflow = 0n;
    let totalOutflow = 0n;
    const rows = [];

    for (const line of lines) {
      const inflow = line.credit;
      const outflow = line.debit;
      running += inflow - outflow;
      totalInflow += inflow;
      totalOutflow += outflow;

      rows.push({
        dateJalali: gregorianToJalali(line.voucher.date),
        kind: line.voucher.kind,
        reference: line.voucher.number,
        description: line.description || line.voucher.description,
        inflow: inflow.toString(),
        outflow: outflow.toString(),
        balance: running.toString(),
      });
    }

    return CashFlowReportSchema.parse({
      fromJalali,
      toJalali,
      openingBalance: openingBalance.toString(),
      closingBalance: running.toString(),
      totalInflow: totalInflow.toString(),
      totalOutflow: totalOutflow.toString(),
      netChange: (totalInflow - totalOutflow).toString(),
      rows,
    });
  }

  async checkReport(query: ReportRangeQuery): Promise<CheckReport> {
    const { fromJalali, toJalali } = ReportRangeQuerySchema.parse(query);
    const from = jalaliToGregorianDate(fromJalali);
    const to = jalaliToGregorianDate(toJalali);
    const asOf = new Date();

    const weekLater = new Date(asOf);
    weekLater.setDate(weekLater.getDate() + 7);

    const checks = await this.prisma.check.findMany({
      where: { dueDate: { gte: from, lte: to } },
      include: { party: true },
      orderBy: [{ dueDate: "asc" }, { sayyadNumber: "asc" }],
    });

    let totalReceivable = 0n;
    let totalPayable = 0n;

    const rows = checks.map((c) => {
      if (c.kind === "RECEIVABLE") totalReceivable += c.amount;
      else totalPayable += c.amount;

      return {
        id: c.id,
        sayyadNumber: c.sayyadNumber,
        kind: c.kind,
        status: CHECK_STATUS_LABELS[c.status] ?? c.status,
        issueJalali: gregorianToJalali(c.issueDate),
        dueJalali: gregorianToJalali(c.dueDate),
        amount: c.amount.toString(),
        partyName: c.party.name,
        bankName: c.bankName,
      };
    });

    const [dueThisWeek, overdue] = await Promise.all([
      this.prisma.check.count({
        where: {
          dueDate: { gte: asOf, lte: weekLater },
          status: { in: ["IN_PORTFOLIO", "DEPOSITED"] },
        },
      }),
      this.prisma.check.count({
        where: {
          dueDate: { lt: asOf },
          status: { in: ["IN_PORTFOLIO", "DEPOSITED"] },
        },
      }),
    ]);

    return CheckReportSchema.parse({
      fromJalali,
      toJalali,
      totalReceivable: totalReceivable.toString(),
      totalPayable: totalPayable.toString(),
      dueThisWeek,
      overdue,
      rows,
    });
  }

  async inventoryKardex(
    query: InventoryKardexQuery,
  ): Promise<InventoryKardexReport> {
    const parsed = InventoryKardexQuerySchema.parse(query);

    const product = await this.prisma.product.findUnique({
      where: { id: parsed.productId },
    });
    if (!product) {
      throw new NotFoundException("کالا یافت نشد");
    }

    type Movement = {
      date: Date;
      kind: string;
      reference: string;
      description: string;
      qtyIn: number;
      qtyOut: number;
    };

    const movements: Movement[] = [];

    const invoiceLines = await this.prisma.invoiceLine.findMany({
      where: {
        productId: product.id,
        invoice: { deletedAt: null },
      },
      include: { invoice: true },
      orderBy: [{ invoice: { date: "asc" } }],
    });

    for (const line of invoiceLines) {
      const inv = line.invoice;
      let qtyIn = 0;
      let qtyOut = 0;
      let kindLabel = "";

      switch (inv.kind) {
        case "PURCHASE":
          qtyIn = line.quantity;
          kindLabel = "خرید";
          break;
        case "PURCHASE_RETURN":
          qtyOut = line.quantity;
          kindLabel = "برگشت خرید";
          break;
        case "SALE":
          qtyOut = line.quantity;
          kindLabel = "فروش";
          break;
        case "SALE_RETURN":
          qtyIn = line.quantity;
          kindLabel = "برگشت فروش";
          break;
      }

      if (qtyIn === 0 && qtyOut === 0) continue;

      movements.push({
        date: inv.date,
        kind: kindLabel,
        reference: inv.number,
        description: inv.description || kindLabel,
        qtyIn,
        qtyOut,
      });
    }

    const adjustments = await this.prisma.weightAdjustment.findMany({
      where: { productId: product.id },
      orderBy: { date: "asc" },
    });

    for (const adj of adjustments) {
      movements.push({
        date: adj.date,
        kind: adj.kind === "SHORTAGE" ? "کسر بار" : "اضافه بار",
        reference: adj.id.slice(0, 8),
        description: adj.reason,
        qtyIn: adj.kind === "SURPLUS" ? adj.quantity : 0,
        qtyOut: adj.kind === "SHORTAGE" ? adj.quantity : 0,
      });
    }

    movements.sort((a, b) => a.date.getTime() - b.date.getTime());

    let runningQty = 0;
    for (const m of movements) {
      const jalali = gregorianToJalali(m.date);
      if (compareJalali(jalali, parsed.fromJalali) < 0) {
        runningQty += m.qtyIn - m.qtyOut;
      }
    }
    const openingQty = runningQty;

    const entries = [];
    for (const m of movements) {
      const jalali = gregorianToJalali(m.date);
      if (compareJalali(jalali, parsed.fromJalali) < 0) continue;
      if (compareJalali(jalali, parsed.toJalali) > 0) continue;

      runningQty += m.qtyIn - m.qtyOut;
      entries.push({
        dateJalali: jalali,
        kind: m.kind,
        reference: m.reference,
        description: m.description,
        quantityIn: m.qtyIn,
        quantityOut: m.qtyOut,
        balanceQty: runningQty,
      });
    }

    return InventoryKardexReportSchema.parse({
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      fromJalali: parsed.fromJalali,
      toJalali: parsed.toJalali,
      openingQty,
      closingQty: runningQty,
      entries,
    });
  }

  async ownerStatus(query: ReportRangeQuery): Promise<OwnerStatusReport> {
    const { fromJalali, toJalali } = ReportRangeQuerySchema.parse(query);
    const from = jalaliToGregorianDate(fromJalali);
    const to = jalaliToGregorianDate(toJalali);

    const owners = await this.prisma.owner.findMany({
      where: { isActive: true },
      include: {
        drawings: {
          where: { date: { gte: from, lte: to } },
        },
      },
      orderBy: { name: "asc" },
    });

    let grandTotal = 0n;
    const rows = owners
      .map((owner) => {
        const total = owner.drawings.reduce((s, d) => s + d.amount, 0n);
        if (total === 0n) return null;
        grandTotal += total;
        return {
          ownerId: owner.id,
          ownerName: owner.name,
          drawingCount: owner.drawings.length,
          totalDrawings: total.toString(),
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    return OwnerStatusReportSchema.parse({
      fromJalali,
      toJalali,
      grandTotal: grandTotal.toString(),
      rows,
    });
  }

  private async liquidAccountIds(): Promise<string[]> {
    const cash = await this.prisma.account.findUnique({
      where: { code: PAYMENT_POSTING_CODES.cash },
    });
    const banks = await this.prisma.bankAccount.findMany({
      where: { isActive: true },
      select: { coaAccountId: true },
    });
    const ids = [
      cash?.id,
      ...banks.map((b) => b.coaAccountId),
    ].filter((id): id is string => Boolean(id));
    return ids;
  }

  private async sumLiquidBalance(
    accountIds: string[],
    asOf: Date,
  ): Promise<bigint> {
    if (accountIds.length === 0) return 0n;

    const grouped = await this.prisma.voucherLine.groupBy({
      by: ["accountId"],
      where: {
        accountId: { in: accountIds },
        voucher: { date: { lte: asOf } },
      },
      _sum: { debit: true, credit: true },
    });

    let total = 0n;
    for (const g of grouped) {
      const debit = g._sum.debit ?? 0n;
      const credit = g._sum.credit ?? 0n;
      total += debit - credit;
    }
    return total;
  }

  private async accountBalanceByCode(
    code: string,
    asOf: Date,
  ): Promise<bigint> {
    const account = await this.prisma.account.findUnique({ where: { code } });
    if (!account) return 0n;
    return this.sumLiquidBalance([account.id], asOf);
  }

  private async totalBankBalance(asOf: Date): Promise<bigint> {
    const banks = await this.prisma.bankAccount.findMany({
      where: { isActive: true },
      select: { coaAccountId: true },
    });
    return this.sumLiquidBalance(
      banks.map((b) => b.coaAccountId),
      asOf,
    );
  }

  private async totalChecksBalance(asOf: Date): Promise<bigint> {
    const codes = [
      CHECK_POSTING_CODES.checksReceivable,
      CHECK_POSTING_CODES.checksInCollection,
    ];
    let total = 0n;
    for (const code of codes) {
      total += await this.accountBalanceByCode(code, asOf);
    }
    return total;
  }

  private async inventoryFromProducts(): Promise<bigint> {
    const products = await this.prisma.product.findMany({
      where: { isActive: true },
      select: { stockQty: true, costPrice: true },
    });
    return products.reduce(
      (sum, p) => sum + BigInt(p.stockQty) * p.costPrice,
      0n,
    );
  }

  private async periodAccountNet(
    code: string,
    from: Date,
    to: Date,
  ): Promise<bigint> {
    const account = await this.prisma.account.findUnique({ where: { code } });
    if (!account) return 0n;

    const grouped = await this.prisma.voucherLine.groupBy({
      by: ["accountId"],
      where: {
        accountId: account.id,
        voucher: { date: { gte: from, lte: to } },
      },
      _sum: { debit: true, credit: true },
    });

    const mov = grouped[0];
    if (!mov) return 0n;
    return netFromMovements(
      "DEBIT",
      mov._sum.debit ?? 0n,
      mov._sum.credit ?? 0n,
    );
  }
}
