import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  CreateVoucherSchema,
  formatVoucherNumber,
  jalaliToGregorianDate,
  type CreateVoucherInput,
  type Voucher,
} from "@hesabyar/shared";
import { PrismaService } from "../prisma/prisma.service";
import { FiscalYearService } from "../fiscal-year/fiscal-year.service";
import { toVoucherDto } from "./voucher.mapper";

@Injectable()
export class VoucherService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fiscalYearService: FiscalYearService,
  ) {}

  async findAll(): Promise<Voucher[]> {
    const rows = await this.prisma.voucher.findMany({
      include: { lines: true },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toVoucherDto);
  }

  async findOne(id: string): Promise<Voucher> {
    const row = await this.prisma.voucher.findUnique({
      where: { id },
      include: { lines: true },
    });
    if (!row) {
      throw new NotFoundException("سند یافت نشد");
    }
    return toVoucherDto(row);
  }

  async create(raw: CreateVoucherInput): Promise<Voucher> {
    // اعتبارسنجی Zod: تراز بودن + یک‌طرفه بودن هر ردیف
    const input = CreateVoucherSchema.parse(raw);
    await this.fiscalYearService.assertWritable(input.dateJalali);
    const date = jalaliToGregorianDate(input.dateJalali);

    // فقط حساب‌های تفصیلی فعال در سند مجازند
    const accountIds = [...new Set(input.lines.map((l) => l.accountId))];
    const accounts = await this.prisma.account.findMany({
      where: { id: { in: accountIds } },
    });
    if (accounts.length !== accountIds.length) {
      throw new BadRequestException("یکی از حساب‌های انتخاب‌شده یافت نشد");
    }
    for (const account of accounts) {
      if (!account.isActive) {
        throw new BadRequestException(`حساب ${account.code} غیرفعال است`);
      }
      if (account.level !== "DETAIL") {
        throw new BadRequestException(
          `فقط حساب تفصیلی قابل ثبت در سند است (${account.code})`,
        );
      }
    }

    const created = await this.prisma.$transaction(async (tx) => {
      // شماره سند در تراکنش اتمیک
      const seq = await tx.voucherSequence.upsert({
        where: { id: 1 },
        create: { id: 1, value: 1 },
        update: { value: { increment: 1 } },
      });
      const number = formatVoucherNumber(seq.value);

      return tx.voucher.create({
        data: {
          number,
          date,
          description: input.description,
          lines: {
            create: input.lines.map((line, index) => ({
              accountId: line.accountId,
              partyId: line.partyId ?? null,
              description: line.description ?? "",
              debit: line.debit,
              credit: line.credit,
              lineOrder: index,
            })),
          },
        },
        include: { lines: true },
      });
    });

    return toVoucherDto(created);
  }
}
