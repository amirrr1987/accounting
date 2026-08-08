import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  CreatePaymentSchema,
  CreateReceiptSchema,
  INVOICE_POSTING_CODES,
  CASH_ACCOUNT_CODES,
  formatReceiptNumber,
  formatPaymentNumber,
  jalaliToGregorianDate,
  type CreatePaymentInput,
  type CreateReceiptInput,
  type Voucher,
} from "@hesabyar/shared";
import { PrismaService } from "../prisma/prisma.service";
import { FiscalYearService } from "../fiscal-year/fiscal-year.service";
import { toVoucherDto } from "../voucher/voucher.mapper";

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fiscalYearService: FiscalYearService,
  ) {}

  async createReceipt(raw: CreateReceiptInput): Promise<Voucher> {
    const input = CreateReceiptSchema.parse(raw);
    await this.fiscalYearService.assertWritable(input.dateJalali);
    const party = await this.requireParty(input.partyId, "CUSTOMER");
    const cash = await this.requireCashAccount(input.cashAccountId);
    const receivable = await this.requireAccountByCode(
      INVOICE_POSTING_CODES.receivable,
    );

    const date = jalaliToGregorianDate(input.dateJalali);
    const description =
      input.description?.trim() ||
      `دریافت از ${party.name}`;

    const created = await this.prisma.$transaction(async (tx) => {
      const seq = await tx.voucherSequence.upsert({
        where: { id: 1 },
        create: { id: 1, value: 1 },
        update: { value: { increment: 1 } },
      });
      const number = formatReceiptNumber(seq.value);

      return tx.voucher.create({
        data: {
          number,
          kind: "RECEIPT",
          date,
          description,
          lines: {
            create: [
              {
                accountId: cash.id,
                description,
                debit: input.amount,
                credit: 0n,
                lineOrder: 0,
              },
              {
                accountId: receivable.id,
                partyId: party.id,
                description,
                debit: 0n,
                credit: input.amount,
                lineOrder: 1,
              },
            ],
          },
        },
        include: { lines: true },
      });
    });

    return toVoucherDto(created);
  }

  async createPayment(raw: CreatePaymentInput): Promise<Voucher> {
    const input = CreatePaymentSchema.parse(raw);
    await this.fiscalYearService.assertWritable(input.dateJalali);
    const party = await this.requireParty(input.partyId, "SUPPLIER");
    const cash = await this.requireCashAccount(input.cashAccountId);
    const payable = await this.requireAccountByCode(
      INVOICE_POSTING_CODES.payable,
    );

    const date = jalaliToGregorianDate(input.dateJalali);
    const description =
      input.description?.trim() ||
      `پرداخت به ${party.name}`;

    const created = await this.prisma.$transaction(async (tx) => {
      const seq = await tx.voucherSequence.upsert({
        where: { id: 1 },
        create: { id: 1, value: 1 },
        update: { value: { increment: 1 } },
      });
      const number = formatPaymentNumber(seq.value);

      return tx.voucher.create({
        data: {
          number,
          kind: "PAYMENT",
          date,
          description,
          lines: {
            create: [
              {
                accountId: payable.id,
                partyId: party.id,
                description,
                debit: input.amount,
                credit: 0n,
                lineOrder: 0,
              },
              {
                accountId: cash.id,
                description,
                debit: 0n,
                credit: input.amount,
                lineOrder: 1,
              },
            ],
          },
        },
        include: { lines: true },
      });
    });

    return toVoucherDto(created);
  }

  private async requireParty(id: string, kind: "CUSTOMER" | "SUPPLIER") {
    const party = await this.prisma.party.findUnique({ where: { id } });
    if (!party || !party.isActive) {
      throw new BadRequestException("طرف‌حساب معتبر نیست");
    }
    if (party.kind !== kind) {
      throw new BadRequestException(
        kind === "CUSTOMER"
          ? "دریافت فقط از مشتری مجاز است"
          : "پرداخت فقط به تأمین‌کننده مجاز است",
      );
    }
    return party;
  }

  private async requireCashAccount(id: string) {
    const account = await this.prisma.account.findUnique({ where: { id } });
    if (!account || !account.isActive || account.level !== "DETAIL") {
      throw new BadRequestException("حساب نقد/بانک معتبر نیست");
    }
    if (
      !CASH_ACCOUNT_CODES.includes(
        account.code as (typeof CASH_ACCOUNT_CODES)[number],
      )
    ) {
      throw new BadRequestException(
        "فقط حساب صندوق (۱۱۱۰۱) یا بانک (۱۱۱۰۳) مجاز است",
      );
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
