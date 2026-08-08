import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  CreateUnitSchema,
  UnitOfMeasureSchema,
  type CreateUnitInput,
  type UnitOfMeasure,
} from "@hesabyar/shared";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class UnitService {
  constructor(private readonly prisma: PrismaService) {}

  private toDto(row: {
    id: string;
    code: string;
    nameFa: string;
    baseUnitId: string | null;
    conversionFactor: number;
    isActive: boolean;
    baseUnit?: { nameFa: string } | null;
  }): UnitOfMeasure {
    return UnitOfMeasureSchema.parse({
      id: row.id,
      code: row.code,
      nameFa: row.nameFa,
      baseUnitId: row.baseUnitId,
      baseUnitNameFa: row.baseUnit?.nameFa ?? null,
      conversionFactor: row.conversionFactor,
      isActive: row.isActive,
    });
  }

  async findAll(): Promise<UnitOfMeasure[]> {
    const rows = await this.prisma.unitOfMeasure.findMany({
      include: { baseUnit: { select: { nameFa: true } } },
      orderBy: { nameFa: "asc" },
    });
    return rows.map((row) => this.toDto(row));
  }

  async findOne(id: string): Promise<UnitOfMeasure> {
    const row = await this.prisma.unitOfMeasure.findUnique({
      where: { id },
      include: { baseUnit: { select: { nameFa: true } } },
    });
    if (!row) {
      throw new NotFoundException("واحد یافت نشد");
    }
    return this.toDto(row);
  }

  async create(raw: CreateUnitInput): Promise<UnitOfMeasure> {
    const input = CreateUnitSchema.parse(raw);
    if (input.baseUnitId) {
      await this.findOne(input.baseUnitId);
    }
    try {
      const row = await this.prisma.unitOfMeasure.create({
        data: {
          code: input.code.toUpperCase(),
          nameFa: input.nameFa,
          baseUnitId: input.baseUnitId ?? null,
          conversionFactor: input.conversionFactor,
          isActive: input.isActive ?? true,
        },
        include: { baseUnit: { select: { nameFa: true } } },
      });
      return this.toDto(row);
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        throw new BadRequestException("کد واحد تکراری است");
      }
      throw e;
    }
  }

  async update(id: string, raw: CreateUnitInput): Promise<UnitOfMeasure> {
    await this.findOne(id);
    const input = CreateUnitSchema.parse(raw);
    if (input.baseUnitId === id) {
      throw new BadRequestException("واحد نمی‌تواند پایه خودش باشد");
    }
    if (input.baseUnitId) {
      await this.findOne(input.baseUnitId);
    }
    try {
      const row = await this.prisma.unitOfMeasure.update({
        where: { id },
        data: {
          code: input.code.toUpperCase(),
          nameFa: input.nameFa,
          baseUnitId: input.baseUnitId ?? null,
          conversionFactor: input.conversionFactor,
          isActive: input.isActive ?? true,
        },
        include: { baseUnit: { select: { nameFa: true } } },
      });
      return this.toDto(row);
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        throw new BadRequestException("کد واحد تکراری است");
      }
      throw e;
    }
  }
}
