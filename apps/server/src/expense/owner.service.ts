import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  CreateOwnerDrawingSchema,
  CreateOwnerSchema,
  EXPENSE_POSTING_CODES,
  PAYMENT_POSTING_CODES,
  formatPaymentNumber,
  gregorianToJalali,
  jalaliToGregorianDate,
  type CreateOwnerDrawingInput,
  type CreateOwnerInput,
  type Owner,
  type OwnerDrawing,
} from "@hesabyar/shared";
import { PrismaService } from "../prisma/prisma.service";
import { FiscalYearService } from "../fiscal-year/fiscal-year.service";

@Injectable()
export class OwnerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fiscalYearService: FiscalYearService,
  ) {}

  async findAll(): Promise<Owner[]> {
    const rows = await this.prisma.owner.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
    return rows.map((row) => this.toOwnerDto(row));
  }

  async create(raw: CreateOwnerInput): Promise<Owner> {
    const input = CreateOwnerSchema.parse(raw);
    const created = await this.prisma.owner.create({
      data: {
        name: input.name.trim(),
        mobile: input.mobile ?? null,
        nationalId: input.nationalId ?? null,
        isActive: input.isActive ?? true,
      },
    });
    return this.toOwnerDto(created);
  }

  async findDrawings(): Promise<OwnerDrawing[]> {
    const rows = await this.prisma.ownerDrawing.findMany({
      include: { owner: true, voucher: true },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });
    return rows.map((row) => this.toDrawingDto(row));
  }

  async createDrawing(raw: CreateOwnerDrawingInput): Promise<OwnerDrawing> {
    const input = CreateOwnerDrawingSchema.parse(raw);
    await this.fiscalYearService.assertWritable(input.dateJalali);

    const owner = await this.prisma.owner.findUnique({
      where: { id: input.ownerId },
    });
    if (!owner || !owner.isActive) {
      throw new BadRequestException("مالک معتبر نیست");
    }

    const drawingAccount = await this.requireAccountByCode(
      EXPENSE_POSTING_CODES.ownerDrawing,
    );
    const creditAccount = await this.resolvePayFromAccount(input);

    const date = jalaliToGregorianDate(input.dateJalali);
    const description =
      input.description?.trim() ||
      `برداشت شخصی — ${owner.name}`;

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
                accountId: drawingAccount.id,
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

      const drawing = await tx.ownerDrawing.create({
        data: {
          ownerId: owner.id,
          date,
          amount: input.amount,
          description,
          payFrom: input.payFrom,
          cashAccountId: input.cashAccountId ?? null,
          bankAccountId: input.bankAccountId ?? null,
          voucherId: voucher.id,
        },
        include: { owner: true, voucher: true },
      });

      return drawing;
    });

    return this.toDrawingDto(created);
  }

  private toOwnerDto(row: {
    id: string;
    name: string;
    mobile: string | null;
    nationalId: string | null;
    isActive: boolean;
  }): Owner {
    return {
      id: row.id,
      name: row.name,
      mobile: row.mobile,
      nationalId: row.nationalId,
      isActive: row.isActive,
    };
  }

  private toDrawingDto(row: {
    id: string;
    ownerId: string;
    date: Date;
    amount: bigint;
    description: string;
    payFrom: "CASH" | "BANK";
    voucherId: string | null;
    owner: { name: string };
    voucher: { number: string } | null;
  }): OwnerDrawing {
    return {
      id: row.id,
      ownerId: row.ownerId,
      ownerName: row.owner.name,
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

  private async requireAccountByCode(code: string) {
    const account = await this.prisma.account.findUnique({ where: { code } });
    if (!account || !account.isActive || account.level !== "DETAIL") {
      throw new NotFoundException(`حساب ${code} یافت نشد`);
    }
    return account;
  }
}
