import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  CHECK_POSTING_CODES,
  CreatePartnerDrawingSchema,
  CreatePartnerSchema,
  INVOICE_POSTING_CODES,
  OwnershipDashboardSchema,
  PARTNER_COA_PARENTS,
  PartnerBalanceReportSchema,
  PAYMENT_POSTING_CODES,
  ReportRangeQuerySchema,
  UpdatePartnerSchema,
  formatPaymentNumber,
  gregorianToJalali,
  jalaliToGregorianDate,
  netFromMovements,
  type CreatePartnerDrawingInput,
  type CreatePartnerInput,
  type OwnershipDashboard,
  type Partner,
  type PartnerBalanceReport,
  type PartnerDrawing,
  type UpdatePartnerInput,
} from "@hesabyar/shared";
import { PrismaService } from "../prisma/prisma.service";
import { FiscalYearService } from "../fiscal-year/fiscal-year.service";
import { ReportService } from "../report/report.service";

@Injectable()
export class PartnerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fiscalYearService: FiscalYearService,
    private readonly reportService: ReportService,
  ) {}

  async findAll(): Promise<Partner[]> {
    const rows = await this.prisma.businessPartner.findMany({
      include: {
        coaCapitalAccount: true,
        coaDrawingAccount: true,
      },
      orderBy: { name: "asc" },
    });
    return rows.map((row) => this.toPartnerDto(row));
  }

  async create(raw: CreatePartnerInput): Promise<Partner> {
    const input = CreatePartnerSchema.parse(raw);
    await this.assertShareBudget(undefined, input.sharePercent);

    const capitalParent = await this.requireCoaParent(
      PARTNER_COA_PARENTS.capital,
    );
    const drawingParent = await this.requireCoaParent(
      PARTNER_COA_PARENTS.drawing,
    );

    const created = await this.prisma.$transaction(async (tx) => {
      const capitalCode = await this.nextCoaCode(tx, capitalParent.id);
      const drawingCode = await this.nextCoaCode(tx, drawingParent.id);

      const capitalAccount = await tx.account.create({
        data: {
          code: capitalCode,
          name: `سرمایه — ${input.name.trim()}`,
          type: "EQUITY",
          nature: "CREDIT",
          level: "DETAIL",
          parentId: capitalParent.id,
          isActive: true,
        },
      });

      const drawingAccount = await tx.account.create({
        data: {
          code: drawingCode,
          name: `برداشت — ${input.name.trim()}`,
          type: "EQUITY",
          nature: "DEBIT",
          level: "DETAIL",
          parentId: drawingParent.id,
          isActive: true,
        },
      });

      return tx.businessPartner.create({
        data: {
          name: input.name.trim(),
          mobile: input.mobile ?? null,
          nationalId: input.nationalId ?? null,
          sharePercent: input.sharePercent,
          coaCapitalAccountId: capitalAccount.id,
          coaDrawingAccountId: drawingAccount.id,
          isActive: input.isActive ?? true,
        },
        include: {
          coaCapitalAccount: true,
          coaDrawingAccount: true,
        },
      });
    });

    return this.toPartnerDto(created);
  }

  async update(id: string, raw: UpdatePartnerInput): Promise<Partner> {
    const input = UpdatePartnerSchema.parse(raw);
    const existing = await this.prisma.businessPartner.findUnique({
      where: { id },
      include: {
        coaCapitalAccount: true,
        coaDrawingAccount: true,
      },
    });
    if (!existing) {
      throw new NotFoundException("شریک یافت نشد");
    }

    if (input.sharePercent !== undefined) {
      await this.assertShareBudget(id, input.sharePercent);
    }

    const updated = await this.prisma.businessPartner.update({
      where: { id },
      data: {
        name: input.name?.trim(),
        mobile: input.mobile,
        nationalId: input.nationalId,
        sharePercent: input.sharePercent,
        isActive: input.isActive,
      },
      include: {
        coaCapitalAccount: true,
        coaDrawingAccount: true,
      },
    });

    if (input.name && input.name.trim() !== existing.name) {
      await this.prisma.$transaction([
        this.prisma.account.update({
          where: { id: existing.coaCapitalAccountId },
          data: { name: `سرمایه — ${input.name.trim()}` },
        }),
        this.prisma.account.update({
          where: { id: existing.coaDrawingAccountId },
          data: { name: `برداشت — ${input.name.trim()}` },
        }),
      ]);
    }

    return this.toPartnerDto(updated);
  }

  async deactivate(id: string): Promise<void> {
    const row = await this.prisma.businessPartner.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException("شریک یافت نشد");
    }
    await this.prisma.$transaction([
      this.prisma.businessPartner.update({
        where: { id },
        data: { isActive: false },
      }),
      this.prisma.account.update({
        where: { id: row.coaCapitalAccountId },
        data: { isActive: false },
      }),
      this.prisma.account.update({
        where: { id: row.coaDrawingAccountId },
        data: { isActive: false },
      }),
    ]);
  }

  async balances(
    fromJalali: string,
    toJalali: string,
  ): Promise<PartnerBalanceReport> {
    const query = ReportRangeQuerySchema.parse({ fromJalali, toJalali });
    const ownership = await this.ownership();
    const profitLoss = await this.reportService.profitLoss(query);
    const netProfit = BigInt(profitLoss.netProfit);
    const netEquity = BigInt(ownership.netEquity);

    const partners = await this.prisma.businessPartner.findMany({
      where: { isActive: true },
      include: {
        coaCapitalAccount: true,
        coaDrawingAccount: true,
      },
      orderBy: { sharePercent: "desc" },
    });

    const rows = await Promise.all(
      partners.map(async (partner) => {
        const [capitalBal, drawingBal] = await Promise.all([
          this.accountBalance(partner.coaCapitalAccountId, "CREDIT"),
          this.accountBalance(partner.coaDrawingAccountId, "DEBIT"),
        ]);

        const equityShare =
          (netEquity * BigInt(Math.round(partner.sharePercent * 100))) / 10000n;
        const profitShare =
          (netProfit * BigInt(Math.round(partner.sharePercent * 100))) / 10000n;
        const netBalance = equityShare + capitalBal - drawingBal;

        return {
          partnerId: partner.id,
          partnerName: partner.name,
          sharePercent: partner.sharePercent,
          capital: capitalBal.toString(),
          drawings: drawingBal.toString(),
          equityShare: equityShare.toString(),
          profitShare: profitShare.toString(),
          netBalance: netBalance.toString(),
        };
      }),
    );

    return PartnerBalanceReportSchema.parse({
      fromJalali,
      toJalali,
      totalAssets: ownership.totalAssets,
      totalLiabilities: ownership.totalLiabilities,
      netEquity: ownership.netEquity,
      sharePercentTotal: ownership.sharePercentTotal,
      isShareValid: ownership.isShareValid,
      rows,
    });
  }

  async ownership(): Promise<OwnershipDashboard> {
    const { totalAssets, totalLiabilities, netEquity } =
      await this.computeNetPosition();

    const partners = await this.prisma.businessPartner.findMany({
      where: { isActive: true },
      orderBy: { sharePercent: "desc" },
    });

    const sharePercentTotal = partners.reduce(
      (sum, p) => sum + p.sharePercent,
      0,
    );
    const isShareValid = Math.abs(sharePercentTotal - 100) < 0.001;

    const slices = partners.map((partner) => {
      const amount =
        (netEquity * BigInt(Math.round(partner.sharePercent * 100))) / 10000n;
      return {
        partnerId: partner.id,
        partnerName: partner.name,
        sharePercent: partner.sharePercent,
        amount: amount.toString(),
        label: `${partner.name} (${partner.sharePercent}٪)`,
      };
    });

    return OwnershipDashboardSchema.parse({
      totalAssets: totalAssets.toString(),
      totalLiabilities: totalLiabilities.toString(),
      netEquity: netEquity.toString(),
      sharePercentTotal,
      isShareValid,
      slices,
    });
  }

  async findDrawings(): Promise<PartnerDrawing[]> {
    const rows = await this.prisma.partnerDrawing.findMany({
      include: { partner: true, voucher: true },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });
    return rows.map((row) => this.toDrawingDto(row));
  }

  async createDrawing(raw: CreatePartnerDrawingInput): Promise<PartnerDrawing> {
    const input = CreatePartnerDrawingSchema.parse(raw);
    await this.fiscalYearService.assertWritable(input.dateJalali);

    const partner = await this.prisma.businessPartner.findUnique({
      where: { id: input.partnerId },
      include: { coaDrawingAccount: true },
    });
    if (!partner || !partner.isActive) {
      throw new BadRequestException("شریک معتبر نیست");
    }

    const creditAccount = await this.resolvePayFromAccount(input);
    const date = jalaliToGregorianDate(input.dateJalali);
    const description =
      input.description?.trim() ||
      `برداشت شریک — ${partner.name}`;

    const created = await this.prisma.$transaction(async (tx) => {
      const seq = await tx.voucherSequence.upsert({
        where: { id: 1 },
        create: { id: 1, value: 1 },
        update: { value: { increment: 1 } },
      });
      const number = formatPaymentNumber(seq.value);

      const voucher = await tx.voucher.create({
        data: {
          number,
          kind: "PAYMENT",
          date,
          description,
          paymentMethod: "CASH",
          bankAccountId: input.bankAccountId ?? null,
          lines: {
            create: [
              {
                accountId: partner.coaDrawingAccountId,
                description,
                debit: input.amount,
                credit: 0n,
                lineOrder: 0,
              },
              {
                accountId: creditAccount.id,
                description,
                debit: 0n,
                credit: input.amount,
                lineOrder: 1,
              },
            ],
          },
        },
      });

      const drawing = await tx.partnerDrawing.create({
        data: {
          partnerId: partner.id,
          date,
          amount: input.amount,
          description,
          payFrom: input.payFrom,
          cashAccountId: input.cashAccountId ?? null,
          bankAccountId: input.bankAccountId ?? null,
          voucherId: voucher.id,
        },
        include: { partner: true, voucher: true },
      });

      return drawing;
    });

    return this.toDrawingDto(created);
  }

  private async computeNetPosition(): Promise<{
    totalAssets: bigint;
    totalLiabilities: bigint;
    netEquity: bigint;
  }> {
    const [
      cash,
      bank,
      receivable,
      inventory,
      checksRecv,
      payable,
      checksPay,
    ] = await Promise.all([
      this.accountBalanceByCode(PAYMENT_POSTING_CODES.cash, "DEBIT"),
      this.totalBankBalance(),
      this.accountBalanceByCode(INVOICE_POSTING_CODES.receivable, "DEBIT"),
      this.accountBalanceByCode(INVOICE_POSTING_CODES.inventory, "DEBIT"),
      this.sumAccountBalances(
        [
          CHECK_POSTING_CODES.checksReceivable,
          CHECK_POSTING_CODES.checksInCollection,
        ],
        "DEBIT",
      ),
      this.accountBalanceByCode(INVOICE_POSTING_CODES.payable, "CREDIT"),
      this.accountBalanceByCode(
        CHECK_POSTING_CODES.checksPayable,
        "CREDIT",
      ),
    ]);

    const totalAssets = cash + bank + receivable + inventory + checksRecv;
    const totalLiabilities = payable + checksPay;
    const netEquity = totalAssets - totalLiabilities;

    return { totalAssets, totalLiabilities, netEquity };
  }

  private async assertShareBudget(
    excludeId: string | undefined,
    newShare: number,
  ): Promise<void> {
    const partners = await this.prisma.businessPartner.findMany({
      where: { isActive: true },
      select: { id: true, sharePercent: true },
    });
    const otherTotal = partners
      .filter((p) => p.id !== excludeId)
      .reduce((sum, p) => sum + p.sharePercent, 0);
    if (otherTotal + newShare > 100.001) {
      throw new BadRequestException(
        `مجموع سهم شرکا نمی‌تواند از ۱۰۰٪ بیشتر شود (فعلی: ${otherTotal}٪ + ${newShare}٪)`,
      );
    }
  }

  private async requireCoaParent(code: string) {
    const parent = await this.prisma.account.findUnique({ where: { code } });
    if (!parent) {
      throw new NotFoundException(`حساب والد ${code} یافت نشد`);
    }
    return parent;
  }

  private async nextCoaCode(
    tx: Pick<PrismaService, "account">,
    parentId: string,
  ): Promise<string> {
    const parent = await tx.account.findUnique({ where: { id: parentId } });
    const children = await tx.account.findMany({
      where: { parentId },
      select: { code: true },
    });
    const base = parent
      ? Number.parseInt(parent.code, 10) * 100
      : 0;
    const maxNum = children.reduce((max, row) => {
      const n = Number.parseInt(row.code, 10);
      return Number.isFinite(n) && n > max ? n : max;
    }, base);
    return String(maxNum + 1);
  }

  private async accountBalance(
    accountId: string,
    nature: "DEBIT" | "CREDIT",
  ): Promise<bigint> {
    const grouped = await this.prisma.voucherLine.groupBy({
      by: ["accountId"],
      where: { accountId },
      _sum: { debit: true, credit: true },
    });
    const mov = grouped[0];
    if (!mov) return 0n;
    const net = netFromMovements(
      nature,
      mov._sum.debit ?? 0n,
      mov._sum.credit ?? 0n,
    );
    return net > 0n ? net : 0n;
  }

  private async accountBalanceByCode(
    code: string,
    nature: "DEBIT" | "CREDIT",
  ): Promise<bigint> {
    const account = await this.prisma.account.findUnique({ where: { code } });
    if (!account) return 0n;
    return this.accountBalance(account.id, nature);
  }

  private async sumAccountBalances(
    codes: string[],
    nature: "DEBIT" | "CREDIT",
  ): Promise<bigint> {
    let total = 0n;
    for (const code of codes) {
      total += await this.accountBalanceByCode(code, nature);
    }
    return total;
  }

  private async totalBankBalance(): Promise<bigint> {
    const banks = await this.prisma.bankAccount.findMany({
      where: { isActive: true },
      select: { coaAccountId: true },
    });
    let total = 0n;
    for (const bank of banks) {
      total += await this.accountBalance(bank.coaAccountId, "DEBIT");
    }
    return total;
  }

  private toPartnerDto(row: {
    id: string;
    name: string;
    mobile: string | null;
    nationalId: string | null;
    sharePercent: number;
    coaCapitalAccountId: string;
    coaDrawingAccountId: string;
    isActive: boolean;
    coaCapitalAccount: { code: string };
    coaDrawingAccount: { code: string };
  }): Partner {
    return {
      id: row.id,
      name: row.name,
      mobile: row.mobile,
      nationalId: row.nationalId,
      sharePercent: row.sharePercent,
      coaCapitalAccountId: row.coaCapitalAccountId,
      coaCapitalAccountCode: row.coaCapitalAccount.code,
      coaDrawingAccountId: row.coaDrawingAccountId,
      coaDrawingAccountCode: row.coaDrawingAccount.code,
      isActive: row.isActive,
    };
  }

  private toDrawingDto(row: {
    id: string;
    partnerId: string;
    date: Date;
    amount: bigint;
    description: string;
    payFrom: "CASH" | "BANK";
    voucherId: string | null;
    partner: { name: string };
    voucher: { number: string } | null;
  }): PartnerDrawing {
    return {
      id: row.id,
      partnerId: row.partnerId,
      partnerName: row.partner.name,
      dateJalali: gregorianToJalali(row.date),
      amount: row.amount.toString(),
      description: row.description,
      payFrom: row.payFrom,
      voucherId: row.voucherId,
      voucherNumber: row.voucher?.number ?? null,
    };
  }

  private async resolvePayFromAccount(input: {
    payFrom: "CASH" | "BANK";
    cashAccountId?: string;
    bankAccountId?: string;
  }) {
    if (input.payFrom === "BANK") {
      if (!input.bankAccountId) {
        throw new BadRequestException("حساب بانکی الزامی است");
      }
      const bank = await this.prisma.bankAccount.findUnique({
        where: { id: input.bankAccountId },
        include: { coaAccount: true },
      });
      if (!bank || !bank.isActive || !bank.coaAccount.isActive) {
        throw new BadRequestException("حساب بانکی معتبر نیست");
      }
      return bank.coaAccount;
    }
    if (!input.cashAccountId) {
      throw new BadRequestException("حساب صندوق الزامی است");
    }
    return this.requireCashAccount(input.cashAccountId);
  }

  private async requireCashAccount(id: string) {
    const account = await this.prisma.account.findUnique({ where: { id } });
    if (!account || !account.isActive || account.level !== "DETAIL") {
      throw new BadRequestException("حساب صندوق معتبر نیست");
    }
    if (account.code !== PAYMENT_POSTING_CODES.cash) {
      throw new BadRequestException("فقط حساب صندوق (۱۱۱۰۱) مجاز است");
    }
    return account;
  }
}
