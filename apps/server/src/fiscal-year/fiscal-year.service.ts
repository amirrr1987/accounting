import { BadRequestException, Injectable } from "@nestjs/common";
import {
  FiscalYearListSchema,
  FiscalYearSchema,
  CreateFiscalYearSchema,
  CloseFiscalYearSchema,
  assertFiscalDateWritable,
  compareJalali,
  currentJalaliYear,
  endOfJalaliYear,
  todayJalali,
  type FiscalYear,
} from "@hesabyar/shared";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class FiscalYearService {
  constructor(private readonly prisma: PrismaService) {}

  private toDto(row: {
    id: string;
    title: string;
    startJalali: string;
    endJalali: string;
    isClosed: boolean;
    isActive: boolean;
    closedThroughJalali: string | null;
  }): FiscalYear {
    return FiscalYearSchema.parse({
      ...row,
      closedThroughJalali: row.closedThroughJalali ?? null,
    });
  }

  async findAll(): Promise<FiscalYear[]> {
    const rows = await this.prisma.fiscalYear.findMany({
      orderBy: { title: "desc" },
    });
    return FiscalYearListSchema.parse(rows.map((r) => this.toDto(r)));
  }

  async getActive(): Promise<FiscalYear | null> {
    const row = await this.prisma.fiscalYear.findFirst({
      where: { isActive: true },
    });
    return row ? this.toDto(row) : null;
  }

  async create(raw: unknown): Promise<FiscalYear> {
    const input = CreateFiscalYearSchema.parse(raw);
    if (compareJalali(input.startJalali, input.endJalali) > 0) {
      throw new BadRequestException("تاریخ شروع باید قبل از پایان باشد");
    }
    try {
      const created = await this.prisma.fiscalYear.create({ data: input });
      return this.toDto(created);
    } catch (e) {
      if (
        e &&
        typeof e === "object" &&
        "code" in e &&
        (e as { code: string }).code === "P2002"
      ) {
        throw new BadRequestException(`سال مالی «${input.title}» از قبل وجود دارد`);
      }
      throw e;
    }
  }

  async activate(id: string): Promise<FiscalYear> {
    await this.prisma.$transaction([
      this.prisma.fiscalYear.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      }),
      this.prisma.fiscalYear.update({
        where: { id },
        data: { isActive: true },
      }),
    ]);
    const row = await this.prisma.fiscalYear.findUniqueOrThrow({
      where: { id },
    });
    return this.toDto(row);
  }

  async close(id: string, raw: unknown): Promise<FiscalYear> {
    const input = CloseFiscalYearSchema.parse(raw);
    const row = await this.prisma.fiscalYear.findUnique({ where: { id } });
    if (!row) {
      throw new BadRequestException("سال مالی یافت نشد");
    }

    const through =
      input.throughJalali ??
      (input.closeYear ? row.endJalali : todayJalali());

    if (
      compareJalali(through, row.startJalali) < 0 ||
      compareJalali(through, row.endJalali) > 0
    ) {
      throw new BadRequestException("تاریخ قفل خارج از سال مالی است");
    }

    const updated = await this.prisma.fiscalYear.update({
      where: { id },
      data: {
        closedThroughJalali: through,
        isClosed: input.closeYear ? true : row.isClosed,
      },
    });

    return this.toDto(updated);
  }

  async reopen(id: string): Promise<FiscalYear> {
    const updated = await this.prisma.fiscalYear.update({
      where: { id },
      data: { isClosed: false, closedThroughJalali: null },
    });
    return this.toDto(updated);
  }

  async assertWritable(dateJalali: string): Promise<void> {
    const active = await this.getActive();
    try {
      assertFiscalDateWritable(
        dateJalali,
        active
          ? {
              title: active.title,
              startJalali: active.startJalali,
              endJalali: active.endJalali,
              isClosed: active.isClosed,
              closedThroughJalali: active.closedThroughJalali ?? null,
            }
          : null,
      );
    } catch (e) {
      throw new BadRequestException(
        e instanceof Error ? e.message : "دوره مالی قفل است",
      );
    }
  }

  /**
   * تضمین وجود و فعال بودن سال مالی منطبق با سال شمسی جاری.
   * تاریخ کسب‌وکار جلالی است؛ اگر سال قبلی هنوز فعال باشد، سال جاری ساخته/فعال می‌شود.
   */
  async ensureDefaultYear(): Promise<FiscalYear | null> {
    const year = currentJalaliYear();
    const endJalali = endOfJalaliYear(year);
    const startJalali = `${year}/01/01`;

    let current = await this.prisma.fiscalYear.findUnique({
      where: { title: year },
    });

    if (!current) {
      current = await this.prisma.fiscalYear.create({
        data: {
          title: year,
          startJalali,
          endJalali,
          isActive: false,
        },
      });
    } else if (current.endJalali !== endJalali) {
      // اصلاح پایان سال کبیسه در داده‌های قدیمی
      current = await this.prisma.fiscalYear.update({
        where: { id: current.id },
        data: { endJalali },
      });
    }

    const active = await this.getActive();
    if (!active || active.title !== year) {
      return this.activate(current.id);
    }

    return this.toDto(current);
  }
}
