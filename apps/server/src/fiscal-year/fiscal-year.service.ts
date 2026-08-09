import { BadRequestException, Injectable } from "@nestjs/common";
import {
  FiscalYearListSchema,
  FiscalYearSchema,
  CreateFiscalYearSchema,
  CloseFiscalYearSchema,
  assertFiscalDateWritable,
  compareJalali,
  todayJalali,
  type FiscalYear,
} from "@hesabyar/shared";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class FiscalYearService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<FiscalYear[]> {
    const rows = await this.prisma.fiscalYear.findMany({
      orderBy: { title: "desc" },
    });
    return FiscalYearListSchema.parse(
      rows.map((r) => ({
        ...r,
        closedThroughJalali: r.closedThroughJalali ?? null,
      })),
    );
  }

  async getActive(): Promise<FiscalYear | null> {
    const row = await this.prisma.fiscalYear.findFirst({
      where: { isActive: true },
    });
    return row
      ? FiscalYearSchema.parse({
          ...row,
          closedThroughJalali: row.closedThroughJalali ?? null,
        })
      : null;
  }

  async create(raw: unknown): Promise<FiscalYear> {
    const input = CreateFiscalYearSchema.parse(raw);
    const created = await this.prisma.fiscalYear.create({ data: input });
    return FiscalYearSchema.parse({
      ...created,
      closedThroughJalali: created.closedThroughJalali ?? null,
    });
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
    return FiscalYearSchema.parse({
      ...row,
      closedThroughJalali: row.closedThroughJalali ?? null,
    });
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

    return FiscalYearSchema.parse({
      ...updated,
      closedThroughJalali: updated.closedThroughJalali ?? null,
    });
  }

  async reopen(id: string): Promise<FiscalYear> {
    const updated = await this.prisma.fiscalYear.update({
      where: { id },
      data: { isClosed: false, closedThroughJalali: null },
    });
    return FiscalYearSchema.parse({
      ...updated,
      closedThroughJalali: null,
    });
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

  async ensureDefaultYear(): Promise<FiscalYear | null> {
    const active = await this.getActive();
    if (active) return active;

    const today = todayJalali();
    const year = today.split("/")[0] ?? "1403";
    const existing = await this.prisma.fiscalYear.findUnique({
      where: { title: year },
    });
    if (existing) {
      const row = await this.prisma.fiscalYear.update({
        where: { id: existing.id },
        data: { isActive: true },
      });
      return FiscalYearSchema.parse({
        ...row,
        closedThroughJalali: row.closedThroughJalali ?? null,
      });
    }

    const created = await this.prisma.fiscalYear.create({
      data: {
        title: year,
        startJalali: `${year}/01/01`,
        endJalali: `${year}/12/29`,
        isActive: true,
      },
    });
    return FiscalYearSchema.parse({
      ...created,
      closedThroughJalali: null,
    });
  }
}
