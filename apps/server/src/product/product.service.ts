import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  CreateProductSchema,
  type CreateProductInput,
  type Product,
} from "@hesabyar/shared";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { toProductDto } from "./product.mapper";

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Product[]> {
    const rows = await this.prisma.product.findMany({
      include: { defaultUnit: true },
      orderBy: { name: "asc" },
    });
    return rows.map(toProductDto);
  }

  async findOne(id: string): Promise<Product> {
    const row = await this.prisma.product.findUnique({
      where: { id },
      include: { defaultUnit: true },
    });
    if (!row) {
      throw new NotFoundException("کالا یافت نشد");
    }
    return toProductDto(row);
  }

  async create(raw: CreateProductInput): Promise<Product> {
    const input = CreateProductSchema.parse(raw);
    try {
      const row = await this.prisma.product.create({
        data: {
          sku: input.sku,
          name: input.name,
          unitPrice: input.unitPrice,
          costPrice: input.costPrice ?? 0n,
          stockQty: input.stockQty ?? 0,
          vatRate: input.vatRate,
          pricingMode: input.pricingMode ?? "AT_INVOICE",
          defaultUnitId: input.defaultUnitId ?? null,
          isActive: input.isActive ?? true,
        },
      });
      return toProductDto(row);
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        throw new BadRequestException("کد کالا تکراری است");
      }
      throw e;
    }
  }

  async update(id: string, raw: CreateProductInput): Promise<Product> {
    await this.findOne(id);
    const input = CreateProductSchema.parse(raw);
    try {
      const row = await this.prisma.product.update({
        where: { id },
        data: {
          sku: input.sku,
          name: input.name,
          unitPrice: input.unitPrice,
          costPrice: input.costPrice ?? 0n,
          stockQty: input.stockQty ?? 0,
          vatRate: input.vatRate,
          pricingMode: input.pricingMode ?? "AT_INVOICE",
          defaultUnitId: input.defaultUnitId ?? null,
          isActive: input.isActive ?? true,
        },
      });
      return toProductDto(row);
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        throw new BadRequestException("کد کالا تکراری است");
      }
      throw e;
    }
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
