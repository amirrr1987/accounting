import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  CHECK_POSTING_CODES,
  CHECK_STATUS_LABELS,
  CheckQuerySchema,
  CheckSchema,
  CheckSummarySchema,
  CreateCheckSchema,
  UpdateCheckStatusSchema,
  assertCheckStatusTransition,
  formatReceiptNumber,
  formatPaymentNumber,
  formatVoucherNumber,
  gregorianToJalali,
  jalaliToGregorianDate,
  type Check,
  type CheckQuery,
  type CheckSummary,
  type CreateCheckInput,
  type CheckDetails,
  type UpdateCheckStatusInput,
} from "@hesabyar/shared";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { FiscalYearService } from "../fiscal-year/fiscal-year.service";

type CheckRow = Prisma.CheckGetPayload<{
  include: {
    party: true;
    receiptVoucher: true;
    bankAccount: true;
    events: { include: { voucher: true } };
  };
}>;

@Injectable()
export class CheckService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fiscalYearService: FiscalYearService,
  ) {}

  private readonly include = {
    party: true,
    receiptVoucher: true,
    bankAccount: true,
    events: {
      include: { voucher: true },
      orderBy: { createdAt: "asc" as const },
    },
  };

  async findAll(raw?: CheckQuery): Promise<Check[]> {
    const query = CheckQuerySchema.parse(raw ?? {});
    const where: Prisma.CheckWhereInput = {};

    if (query.status) where.status = query.status;
    if (query.kind) where.kind = query.kind;
    if (query.dueFromJalali || query.dueToJalali) {
      where.dueDate = {};
      if (query.dueFromJalali) {
        where.dueDate.gte = jalaliToGregorianDate(query.dueFromJalali);
      }
      if (query.dueToJalali) {
        where.dueDate.lte = jalaliToGregorianDate(query.dueToJalali);
      }
    }

    const rows = await this.prisma.check.findMany({
      where,
      include: this.include,
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    });
    return rows.map((row) => this.toDto(row));
  }

  async findOne(id: string): Promise<Check> {
    const row = await this.prisma.check.findUnique({
      where: { id },
      include: this.include,
    });
    if (!row) {
      throw new NotFoundException("چک یافت نشد");
    }
    return this.toDto(row);
  }

  async summary(): Promise<CheckSummary> {
    const today = jalaliToGregorianDate(gregorianToJalali(new Date()));
    const weekLater = new Date(today);
    weekLater.setDate(weekLater.getDate() + 7);

    const [total, groups, dueThisWeek, overdue] = await Promise.all([
      this.prisma.check.count(),
      this.prisma.check.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      this.prisma.check.count({
        where: {
          dueDate: { gte: today, lte: weekLater },
          status: { in: ["IN_PORTFOLIO", "DEPOSITED"] },
        },
      }),
      this.prisma.check.count({
        where: {
          dueDate: { lt: today },
          status: { in: ["IN_PORTFOLIO", "DEPOSITED"] },
        },
      }),
    ]);

    const byStatus = {
      IN_PORTFOLIO: 0,
      DEPOSITED: 0,
      CLEARED: 0,
      RETURNED: 0,
      ENDORSED: 0,
      PAID: 0,
    };
    for (const g of groups) {
      byStatus[g.status] = g._count._all;
    }

    return CheckSummarySchema.parse({
      total,
      byStatus,
      dueThisWeek,
      overdue,
    });
  }

  async create(raw: CreateCheckInput): Promise<Check> {
    const input = CreateCheckSchema.parse(raw);
    await this.fiscalYearService.assertWritable(input.dateJalali);

    const party = await this.prisma.party.findUnique({
      where: { id: input.partyId },
    });
    if (!party || !party.isActive) {
      throw new BadRequestException("طرف‌حساب معتبر نیست");
    }
    if (input.kind === "RECEIVABLE" && party.kind !== "CUSTOMER") {
      throw new BadRequestException("چک دریافتی فقط از مشتری است");
    }
    if (input.kind === "PAYABLE" && party.kind !== "SUPPLIER") {
      throw new BadRequestException("چک پرداختی فقط برای تأمین‌کننده است");
    }

    const issueDate = jalaliToGregorianDate(input.issueJalali);
    const dueDate = jalaliToGregorianDate(input.dueJalali);
    const txnDate = jalaliToGregorianDate(input.dateJalali);
    const description =
      input.description?.trim() ||
      `چک صیاد ${input.sayyadNumber} — ${party.name}`;

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const voucher = await this.createInitialVoucher(tx, {
          kind: input.kind,
          partyId: party.id,
          partyName: party.name,
          amount: input.amount,
          date: txnDate,
          description,
        });

        const check = await tx.check.create({
          data: {
            kind: input.kind,
            sayyadNumber: input.sayyadNumber,
            issueDate,
            dueDate,
            amount: input.amount,
            partyId: party.id,
            drawerNationalId: input.drawerNationalId,
            drawerMobile: input.drawerMobile,
            bankName: input.bankName,
            branchCode: input.branchCode ?? null,
            accountNumber: input.accountNumber ?? null,
            status: "IN_PORTFOLIO",
            receiptVoucherId: voucher.id,
            bankAccountId: input.bankAccountId ?? null,
            events: {
              create: {
                status: "IN_PORTFOLIO",
                date: txnDate,
                note: "ثبت اولیه چک",
                voucherId: voucher.id,
              },
            },
          },
          include: this.include,
        });

        return check;
      });

      return this.toDto(created);
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        throw new BadRequestException("شماره صیاد تکراری است");
      }
      throw e;
    }
  }

  async createFromPayment(
    tx: Parameters<Parameters<PrismaService["$transaction"]>[0]>[0],
    params: {
      kind: "RECEIVABLE" | "PAYABLE";
      partyId: string;
      amount: bigint;
      voucherId: string;
      voucherDate: Date;
      check: CheckDetails;
    },
  ): Promise<void> {
    const issueDate = jalaliToGregorianDate(params.check.issueJalali);
    const dueDate = jalaliToGregorianDate(params.check.dueJalali);

    await tx.check.create({
      data: {
        kind: params.kind,
        sayyadNumber: params.check.sayyadNumber,
        issueDate,
        dueDate,
        amount: params.amount,
        partyId: params.partyId,
        drawerNationalId: params.check.drawerNationalId,
        drawerMobile: params.check.drawerMobile,
        bankName: params.check.bankName,
        branchCode: params.check.branchCode ?? null,
        accountNumber: params.check.accountNumber ?? null,
        status: "IN_PORTFOLIO",
        receiptVoucherId: params.voucherId,
        events: {
          create: {
            status: "IN_PORTFOLIO",
            date: params.voucherDate,
            note: "ثبت از دریافت/پرداخت",
            voucherId: params.voucherId,
          },
        },
      },
    });
  }

  async updateStatus(id: string, raw: UpdateCheckStatusInput): Promise<Check> {
    const input = UpdateCheckStatusSchema.parse(raw);
    await this.fiscalYearService.assertWritable(input.dateJalali);

    const check = await this.prisma.check.findUnique({
      where: { id },
      include: this.include,
    });
    if (!check) {
      throw new NotFoundException("چک یافت نشد");
    }

    try {
      assertCheckStatusTransition(check.kind, check.status, input.status);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : "انتقال وضعیت مجاز نیست",
      );
    }

    const needsBank = ["DEPOSITED", "CLEARED", "PAID"].includes(input.status);
    if (needsBank && !input.bankAccountId) {
      throw new BadRequestException("حساب بانکی برای این عملیات الزامی است");
    }

    const bankAccount = input.bankAccountId
      ? await this.requireBankAccount(input.bankAccountId)
      : null;

    const date = jalaliToGregorianDate(input.dateJalali);
    const note =
      input.note?.trim() ||
      `تغییر وضعیت به ${CHECK_STATUS_LABELS[input.status]}`;

    const updated = await this.prisma.$transaction(async (tx) => {
      const voucher = await this.createStatusVoucher(tx, {
        check,
        status: input.status,
        date,
        description: note,
        bankCoaAccountId: bankAccount?.coaAccountId,
      });

      return tx.check.update({
        where: { id },
        data: {
          status: input.status,
          bankAccountId: bankAccount?.id ?? check.bankAccountId,
          events: {
            create: {
              status: input.status,
              date,
              note,
              voucherId: voucher.id,
            },
          },
        },
        include: this.include,
      });
    });

    return this.toDto(updated);
  }

  private async createInitialVoucher(
    tx: Parameters<Parameters<PrismaService["$transaction"]>[0]>[0],
    params: {
      kind: "RECEIVABLE" | "PAYABLE";
      partyId: string;
      partyName: string;
      amount: bigint;
      date: Date;
      description: string;
    },
  ) {
    if (params.kind === "RECEIVABLE") {
      const checks = await this.requireAccount(CHECK_POSTING_CODES.checksReceivable);
      const receivable = await this.requireAccount(CHECK_POSTING_CODES.receivable);
      const seq = await tx.voucherSequence.upsert({
        where: { id: 1 },
        create: { id: 1, value: 1 },
        update: { value: { increment: 1 } },
      });
      return tx.voucher.create({
        data: {
          number: formatReceiptNumber(seq.value),
          kind: "RECEIPT",
          date: params.date,
          description: params.description,
          paymentMethod: "CHECK_RECEIVABLE",
          lines: {
            create: [
              {
                accountId: checks.id,
                description: params.description,
                debit: params.amount,
                credit: 0n,
                lineOrder: 0,
              },
              {
                accountId: receivable.id,
                partyId: params.partyId,
                description: params.description,
                debit: 0n,
                credit: params.amount,
                lineOrder: 1,
              },
            ],
          },
        },
      });
    }

    const payable = await this.requireAccount(CHECK_POSTING_CODES.payable);
    const checks = await this.requireAccount(CHECK_POSTING_CODES.checksPayable);
    const seq = await tx.voucherSequence.upsert({
      where: { id: 1 },
      create: { id: 1, value: 1 },
      update: { value: { increment: 1 } },
    });
    return tx.voucher.create({
      data: {
        number: formatPaymentNumber(seq.value),
        kind: "PAYMENT",
        date: params.date,
        description: params.description,
        paymentMethod: "CHECK_PAYABLE",
        lines: {
          create: [
            {
              accountId: payable.id,
              partyId: params.partyId,
              description: params.description,
              debit: params.amount,
              credit: 0n,
              lineOrder: 0,
            },
            {
              accountId: checks.id,
              description: params.description,
              debit: 0n,
              credit: params.amount,
              lineOrder: 1,
            },
          ],
        },
      },
    });
  }

  private async createStatusVoucher(
    tx: Parameters<Parameters<PrismaService["$transaction"]>[0]>[0],
    params: {
      check: CheckRow;
      status: UpdateCheckStatusInput["status"];
      date: Date;
      description: string;
      bankCoaAccountId?: string;
    },
  ) {
    const amount = params.check.amount;
    const lines: Array<{
      accountId: string;
      partyId?: string;
      description: string;
      debit: bigint;
      credit: bigint;
      lineOrder: number;
    }> = [];

    const checksRecv = await this.requireAccount(
      CHECK_POSTING_CODES.checksReceivable,
    );
    const checksInCol = await this.requireAccount(
      CHECK_POSTING_CODES.checksInCollection,
    );
    const receivable = await this.requireAccount(CHECK_POSTING_CODES.receivable);
    const checksPay = await this.requireAccount(CHECK_POSTING_CODES.checksPayable);
    const payable = await this.requireAccount(CHECK_POSTING_CODES.payable);

    if (params.check.kind === "RECEIVABLE") {
      switch (params.status) {
        case "DEPOSITED":
          lines.push(
            {
              accountId: checksInCol.id,
              description: params.description,
              debit: amount,
              credit: 0n,
              lineOrder: 0,
            },
            {
              accountId: checksRecv.id,
              description: params.description,
              debit: 0n,
              credit: amount,
              lineOrder: 1,
            },
          );
          break;
        case "CLEARED": {
          if (!params.bankCoaAccountId) {
            throw new BadRequestException("حساب بانکی الزامی است");
          }
          lines.push(
            {
              accountId: params.bankCoaAccountId,
              description: params.description,
              debit: amount,
              credit: 0n,
              lineOrder: 0,
            },
            {
              accountId: checksInCol.id,
              description: params.description,
              debit: 0n,
              credit: amount,
              lineOrder: 1,
            },
          );
          break;
        }
        case "RETURNED":
          if (params.check.status === "DEPOSITED") {
            lines.push(
              {
                accountId: checksRecv.id,
                description: params.description,
                debit: amount,
                credit: 0n,
                lineOrder: 0,
              },
              {
                accountId: checksInCol.id,
                description: params.description,
                debit: 0n,
                credit: amount,
                lineOrder: 1,
              },
              {
                accountId: receivable.id,
                partyId: params.check.partyId,
                description: params.description,
                debit: amount,
                credit: 0n,
                lineOrder: 2,
              },
              {
                accountId: checksRecv.id,
                description: params.description,
                debit: 0n,
                credit: amount,
                lineOrder: 3,
              },
            );
          } else {
            lines.push(
              {
                accountId: receivable.id,
                partyId: params.check.partyId,
                description: params.description,
                debit: amount,
                credit: 0n,
                lineOrder: 0,
              },
              {
                accountId: checksRecv.id,
                description: params.description,
                debit: 0n,
                credit: amount,
                lineOrder: 1,
              },
            );
          }
          break;
        default:
          throw new BadRequestException("وضعیت پشتیبانی نمی‌شود");
      }
    } else {
      switch (params.status) {
        case "PAID": {
          if (!params.bankCoaAccountId) {
            throw new BadRequestException("حساب بانکی الزامی است");
          }
          lines.push(
            {
              accountId: checksPay.id,
              description: params.description,
              debit: amount,
              credit: 0n,
              lineOrder: 0,
            },
            {
              accountId: params.bankCoaAccountId,
              description: params.description,
              debit: 0n,
              credit: amount,
              lineOrder: 1,
            },
          );
          break;
        }
        case "RETURNED":
          lines.push(
            {
              accountId: checksPay.id,
              description: params.description,
              debit: amount,
              credit: 0n,
              lineOrder: 0,
            },
            {
              accountId: payable.id,
              partyId: params.check.partyId,
              description: params.description,
              debit: 0n,
              credit: amount,
              lineOrder: 1,
            },
          );
          break;
        default:
          throw new BadRequestException("وضعیت پشتیبانی نمی‌شود");
      }
    }

    const vSeq = await tx.voucherSequence.upsert({
      where: { id: 1 },
      create: { id: 1, value: 1 },
      update: { value: { increment: 1 } },
    });

    return tx.voucher.create({
      data: {
        number: formatVoucherNumber(vSeq.value),
        kind: "GENERAL",
        date: params.date,
        description: params.description,
        bankAccountId: params.check.bankAccountId,
        lines: { create: lines },
      },
    });
  }

  private async requireAccount(code: string) {
    const account = await this.prisma.account.findUnique({ where: { code } });
    if (!account || !account.isActive || account.level !== "DETAIL") {
      throw new NotFoundException(`حساب ${code} یافت نشد`);
    }
    return account;
  }

  private async requireBankAccount(id: string) {
    const bank = await this.prisma.bankAccount.findUnique({
      where: { id },
      include: { coaAccount: true },
    });
    if (!bank || !bank.isActive || !bank.coaAccount.isActive) {
      throw new BadRequestException("حساب بانکی معتبر نیست");
    }
    return bank;
  }

  private toDto(row: CheckRow): Check {
    return CheckSchema.parse({
      id: row.id,
      kind: row.kind,
      sayyadNumber: row.sayyadNumber,
      issueJalali: gregorianToJalali(row.issueDate),
      dueJalali: gregorianToJalali(row.dueDate),
      amount: row.amount.toString(),
      partyId: row.partyId,
      partyName: row.party.name,
      drawerNationalId: row.drawerNationalId,
      drawerMobile: row.drawerMobile,
      bankName: row.bankName,
      branchCode: row.branchCode,
      accountNumber: row.accountNumber,
      status: row.status,
      receiptVoucherId: row.receiptVoucherId,
      receiptVoucherNumber: row.receiptVoucher?.number ?? null,
      bankAccountId: row.bankAccountId,
      bankAccountName: row.bankAccount?.name ?? null,
      events: row.events.map((event) => ({
        id: event.id,
        status: event.status,
        dateJalali: gregorianToJalali(event.date),
        note: event.note,
        voucherId: event.voucherId,
        voucherNumber: event.voucher?.number ?? null,
      })),
    });
  }
}
