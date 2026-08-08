import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  CreateWeightAdjustmentSchema,
  WEIGHT_ADJUSTMENT_POSTING_CODES,
  WEIGHT_ADJUSTMENT_KIND_LABELS,
  formatVoucherNumber,
  gregorianToJalali,
  jalaliToGregorianDate,
  type CreateWeightAdjustmentInput,
  type WeightAdjustment,
} from "@hesabyar/shared";
import { PrismaService } from "../prisma/prisma.service";
import { FiscalYearService } from "../fiscal-year/fiscal-year.service";

@Injectable()
export class WeightAdjustmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fiscalYearService: FiscalYearService,
  ) {}

  async findAll(): Promise<WeightAdjustment[]> {
    const rows = await this.prisma.weightAdjustment.findMany({
      include: {
        product: true,
        sourceInvoice: true,
        voucher: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => this.toDto(row));
  }

  async create(raw: CreateWeightAdjustmentInput): Promise<WeightAdjustment> {
    const input = CreateWeightAdjustmentSchema.parse(raw);
    await this.fiscalYearService.assertWritable(input.dateJalali);

    const product = await this.prisma.product.findUnique({
      where: { id: input.productId },
    });
    if (!product || !product.isActive) {
      throw new BadRequestException("کالا معتبر نیست");
    }

    if (input.kind === "SHORTAGE" && product.stockQty < input.quantity) {
      throw new BadRequestException(
        `موجودی ${product.name} (${product.stockQty}) برای کسر بار کافی نیست`,
      );
    }

    if (input.sourceInvoiceId) {
      const inv = await this.prisma.invoice.findUnique({
        where: { id: input.sourceInvoiceId },
      });
      if (!inv || inv.deletedAt || inv.kind !== "PURCHASE") {
        throw new BadRequestException("فاکتور خرید مبدأ معتبر نیست");
      }
    }

    const costAmount = product.costPrice * BigInt(input.quantity);
    const date = jalaliToGregorianDate(input.dateJalali);
    const kindLabel = WEIGHT_ADJUSTMENT_KIND_LABELS[input.kind];
    const description = `${kindLabel} — ${product.name} — ${input.reason}`;

    const inventory = await this.requireAccount(
      WEIGHT_ADJUSTMENT_POSTING_CODES.inventory,
    );
    const counter = await this.requireAccount(
      input.kind === "SHORTAGE"
        ? WEIGHT_ADJUSTMENT_POSTING_CODES.shortage
        : WEIGHT_ADJUSTMENT_POSTING_CODES.surplus,
    );

    const created = await this.prisma.$transaction(async (tx) => {
      if (input.kind === "SHORTAGE") {
        const updated = await tx.product.updateMany({
          where: { id: product.id, stockQty: { gte: input.quantity } },
          data: { stockQty: { decrement: input.quantity } },
        });
        if (updated.count !== 1) {
          throw new BadRequestException("موجودی کافی برای کسر بار نیست");
        }
      } else {
        await tx.product.update({
          where: { id: product.id },
          data: { stockQty: { increment: input.quantity } },
        });
      }

      const vSeq = await tx.voucherSequence.upsert({
        where: { id: 1 },
        create: { id: 1, value: 1 },
        update: { value: { increment: 1 } },
      });

      const voucher = await tx.voucher.create({
        data: {
          number: formatVoucherNumber(vSeq.value),
          kind: "GENERAL",
          date,
          description,
          lines: {
            create:
              input.kind === "SHORTAGE"
                ? [
                    {
                      accountId: counter.id,
                      description,
                      debit: costAmount,
                      credit: 0n,
                      lineOrder: 0,
                    },
                    {
                      accountId: inventory.id,
                      description,
                      debit: 0n,
                      credit: costAmount,
                      lineOrder: 1,
                    },
                  ]
                : [
                    {
                      accountId: inventory.id,
                      description,
                      debit: costAmount,
                      credit: 0n,
                      lineOrder: 0,
                    },
                    {
                      accountId: counter.id,
                      description,
                      debit: 0n,
                      credit: costAmount,
                      lineOrder: 1,
                    },
                  ],
          },
        },
      });

      return tx.weightAdjustment.create({
        data: {
          productId: product.id,
          kind: input.kind,
          quantity: input.quantity,
          reason: input.reason,
          date,
          costAmount,
          sourceInvoiceId: input.sourceInvoiceId ?? null,
          voucherId: voucher.id,
        },
        include: {
          product: true,
          sourceInvoice: true,
          voucher: true,
        },
      });
    });

    return this.toDto(created);
  }

  private async requireAccount(code: string) {
    const account = await this.prisma.account.findUnique({ where: { code } });
    if (!account || !account.isActive || account.level !== "DETAIL") {
      throw new NotFoundException(`حساب ${code} یافت نشد`);
    }
    return account;
  }

  private toDto(row: {
    id: string;
    productId: string;
    kind: "SHORTAGE" | "SURPLUS";
    quantity: number;
    reason: string;
    date: Date;
    costAmount: bigint;
    sourceInvoiceId: string | null;
    voucherId: string | null;
    product: { name: string };
    sourceInvoice: { number: string } | null;
    voucher: { number: string } | null;
  }): WeightAdjustment {
    return {
      id: row.id,
      productId: row.productId,
      productName: row.product.name,
      kind: row.kind,
      quantity: row.quantity,
      reason: row.reason,
      dateJalali: gregorianToJalali(row.date),
      costAmount: row.costAmount.toString(),
      sourceInvoiceId: row.sourceInvoiceId,
      sourceInvoiceNumber: row.sourceInvoice?.number ?? null,
      voucherId: row.voucherId,
      voucherNumber: row.voucher?.number ?? null,
    };
  }
}
