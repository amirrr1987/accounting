import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  CreateExpenseSchema,
  ExpenseSummaryQuerySchema,
  PAYMENT_POSTING_CODES,
  formatPaymentNumber,
  gregorianToJalali,
  isJalaliInRange,
  jalaliToGregorianDate,
  type CreateExpenseInput,
  type Expense,
  type ExpenseCategory,
  type ExpenseSummary,
} from "@hesabyar/shared";
import { PrismaService } from "../prisma/prisma.service";
import { FiscalYearService } from "../fiscal-year/fiscal-year.service";

@Injectable()
export class ExpenseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fiscalYearService: FiscalYearService,
  ) {}

  async findCategories(): Promise<ExpenseCategory[]> {
    const rows = await this.prisma.expenseCategory.findMany({
      where: { isActive: true },
      orderBy: { code: "asc" },
    });
    return rows.map((row) => ({
      id: row.id,
      code: row.code,
      nameFa: row.nameFa,
      coaAccountCode: row.coaAccountCode,
      isSystem: row.isSystem,
      isActive: row.isActive,
    }));
  }

  async findAll(): Promise<Expense[]> {
    const rows = await this.prisma.expense.findMany({
      include: {
        category: true,
        party: true,
        voucher: true,
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });
    return rows.map((row) => this.toDto(row));
  }

  async create(raw: CreateExpenseInput): Promise<Expense> {
    const input = CreateExpenseSchema.parse(raw);
    await this.fiscalYearService.assertWritable(input.dateJalali);

    const category = await this.prisma.expenseCategory.findUnique({
      where: { id: input.categoryId },
    });
    if (!category || !category.isActive) {
      throw new BadRequestException("دسته هزینه معتبر نیست");
    }

    const expenseAccount = await this.requireAccountByCode(
      category.coaAccountCode,
    );
    const creditAccount = await this.resolvePayFromAccount(input);

    let partyId: string | null = null;
    if (input.partyId) {
      const party = await this.prisma.party.findUnique({
        where: { id: input.partyId },
      });
      if (!party || !party.isActive) {
        throw new BadRequestException("طرف‌حساب معتبر نیست");
      }
      partyId = party.id;
    }

    const date = jalaliToGregorianDate(input.dateJalali);
    const description =
      input.description?.trim() ||
      `هزینه — ${category.nameFa}`;

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
                accountId: expenseAccount.id,
                partyId,
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

      const expense = await tx.expense.create({
        data: {
          categoryId: category.id,
          date,
          amount: input.amount,
          description,
          payFrom: input.payFrom,
          cashAccountId: input.cashAccountId ?? null,
          bankAccountId: input.bankAccountId ?? null,
          partyId,
          voucherId: voucher.id,
        },
        include: {
          category: true,
          party: true,
          voucher: true,
        },
      });

      return expense;
    });

    return this.toDto(created);
  }

  async summary(raw: {
    fromJalali: string;
    toJalali: string;
  }): Promise<ExpenseSummary> {
    const query = ExpenseSummaryQuerySchema.parse(raw);
    const rows = await this.prisma.expense.findMany({
      include: { category: true },
    });

    const filtered = rows.filter((row) => {
      const jalali = gregorianToJalali(row.date);
      return isJalaliInRange(jalali, query.fromJalali, query.toJalali);
    });

    const byCategory = new Map<
      string,
      { category: (typeof rows)[0]["category"]; total: bigint; count: number }
    >();

    for (const row of filtered) {
      const current = byCategory.get(row.categoryId) ?? {
        category: row.category,
        total: 0n,
        count: 0,
      };
      current.total += row.amount;
      current.count += 1;
      byCategory.set(row.categoryId, current);
    }

    let grandTotal = 0n;
    const summaryRows = [...byCategory.values()]
      .sort((a, b) => a.category.code.localeCompare(b.category.code))
      .map(({ category, total, count }) => {
        grandTotal += total;
        return {
          categoryId: category.id,
          categoryCode: category.code,
          categoryName: category.nameFa,
          total: total.toString(),
          count,
        };
      });

    return {
      fromJalali: query.fromJalali,
      toJalali: query.toJalali,
      grandTotal: grandTotal.toString(),
      rows: summaryRows,
    };
  }

  private toDto(row: {
    id: string;
    categoryId: string;
    date: Date;
    amount: bigint;
    description: string;
    payFrom: "CASH" | "BANK";
    partyId: string | null;
    voucherId: string | null;
    category: { nameFa: string; code: string };
    party: { name: string } | null;
    voucher: { number: string } | null;
  }): Expense {
    return {
      id: row.id,
      categoryId: row.categoryId,
      categoryName: row.category.nameFa,
      categoryCode: row.category.code,
      dateJalali: gregorianToJalali(row.date),
      amount: row.amount.toString(),
      description: row.description,
      payFrom: row.payFrom,
      partyId: row.partyId,
      partyName: row.party?.name ?? null,
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

  private async requireAccountByCode(code: string) {
    const account = await this.prisma.account.findUnique({ where: { code } });
    if (!account || !account.isActive || account.level !== "DETAIL") {
      throw new NotFoundException(`حساب ${code} یافت نشد`);
    }
    return account;
  }
}
