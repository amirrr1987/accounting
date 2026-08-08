import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  CreatePaymentSchema,
  CreateReceiptSchema,
  INVOICE_POSTING_CODES,
  PAYMENT_POSTING_CODES,
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
    const receivable = await this.requireAccountByCode(
      INVOICE_POSTING_CODES.receivable,
    );

    const date = jalaliToGregorianDate(input.dateJalali);
    const description =
      input.description?.trim() ||
      `دریافت از ${party.name}`;

    let debitAccountId: string;
    let creditAccountId: string;
    let creditPartyId: string | undefined = party.id;

    if (input.method === "CHECK_RECEIVABLE") {
      const checks = await this.requireAccountByCode(
        PAYMENT_POSTING_CODES.checksReceivable,
      );
      debitAccountId = checks.id;
      creditAccountId = receivable.id;
    } else {
      const cash = await this.resolveCashOrBankAccount(input);
      debitAccountId = cash.id;
      creditAccountId = receivable.id;
    }

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
          paymentMethod: input.method,
          bankAccountId: input.bankAccountId ?? null,
          lines: {
            create: [
              {
                accountId: debitAccountId,
                description,
                debit: input.amount,
                credit: 0n,
                lineOrder: 0,
              },
              {
                accountId: creditAccountId,
                partyId: creditPartyId ?? null,
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
    const payable = await this.requireAccountByCode(
      INVOICE_POSTING_CODES.payable,
    );

    const date = jalaliToGregorianDate(input.dateJalali);
    const description =
      input.description?.trim() ||
      `پرداخت به ${party.name}`;

    let debitAccountId: string;
    let creditAccountId: string;

    if (input.method === "CHECK_PAYABLE") {
      debitAccountId = payable.id;
      const checks = await this.requireAccountByCode(
        PAYMENT_POSTING_CODES.checksPayable,
      );
      creditAccountId = checks.id;
    } else {
      const cash = await this.resolveCashOrBankAccount(input);
      debitAccountId = payable.id;
      creditAccountId = cash.id;
    }

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
          paymentMethod: input.method,
          bankAccountId: input.bankAccountId ?? null,
          lines: {
            create: [
              {
                accountId: debitAccountId,
                partyId: party.id,
                description,
                debit: input.amount,
                credit: 0n,
                lineOrder: 0,
              },
              {
                accountId: creditAccountId,
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

  private async resolveCashOrBankAccount(input: {
    cashAccountId?: string;
    bankAccountId?: string;
  }) {
    if (input.bankAccountId) {
      const bank = await this.prisma.bankAccount.findUnique({
        where: { id: input.bankAccountId },
        include: { coaAccount: true },
      });
      if (!bank || !bank.isActive || !bank.coaAccount.isActive) {
        throw new BadRequestException("حساب بانکی معتبر نیست");
      }
      return bank.coaAccount;
    }
    if (input.cashAccountId) {
      return this.requireCashAccount(input.cashAccountId);
    }
    throw new BadRequestException("حساب نقد/بانک الزامی است");
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
