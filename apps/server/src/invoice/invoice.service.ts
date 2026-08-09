import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  CreateInvoiceSchema,
  CreateReturnInvoiceSchema,
  INVOICE_POSTING_CODES,
  calcCommissionAmount,
  calcInvoiceLine,
  calcInvoiceTotals,
  calcLineSaleLoss,
  calcReturnLineAmounts,
  assertStockAvailable,
  formatInvoiceNumber,
  formatReturnInvoiceNumber,
  formatVoucherNumber,
  gregorianToJalali,
  jalaliToGregorianDate,
  InvoiceVoucherPreviewSchema,
  lineCogsCost,
  returnKindFor,
  toBaseQuantity,
  weightedAverageCost,
  resolveInvoiceLineUnitPrice,
  ProductPricingModeSchema,
  type CreateInvoiceInput,
  type CreateReturnInvoiceInput,
  type Invoice,
  type InvoicePreviewWarning,
  type InvoiceVoucherPreview,
} from "@hesabyar/shared";
import type { Account, InvoiceKind, UnitOfMeasure } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { FiscalYearService } from "../fiscal-year/fiscal-year.service";
import { toInvoiceDto, type PostingAccountMap } from "./invoice.mapper";

type BuiltLine = {
  accountId: string;
  accountCode: string;
  accountName: string;
  partyId?: string;
  description: string;
  debit: bigint;
  credit: bigint;
};

type InvoiceTotals = {
  subtotal: bigint;
  vatAmount: bigint;
  headerDiscount: bigint;
  total: bigint;
};

type StockRow = {
  productId: string;
  productName: string;
  quantity: number;
  baseQuantity: number;
  unitPrice: bigint;
};

type LineRow = {
  productId: string;
  quantity: number;
  unitPrice: bigint;
  vatRate: number;
  discountAmount: bigint;
  lineNet: bigint;
  lineVat: bigint;
  lineTotal: bigint;
  sourceLineId?: string;
  unitId?: string | null;
  catalogUnitPrice?: bigint;
};

@Injectable()
export class InvoiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fiscalYearService: FiscalYearService,
  ) {}

  private readonly include = {
    party: true,
    voucher: true,
    returnedOf: { select: { number: true } },
    lines: { include: { product: true, unit: true } },
  } as const;

  async findAll(): Promise<Invoice[]> {
    const rows = await this.prisma.invoice.findMany({
      include: this.include,
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => toInvoiceDto(row));
  }

  async findOne(id: string): Promise<Invoice> {
    const row = await this.prisma.invoice.findUnique({
      where: { id },
      include: this.include,
    });
    if (!row) {
      throw new NotFoundException("فاکتور یافت نشد");
    }
    const returnedByLineId = await this.loadReturnedQtyByLine(
      row.lines.map((l) => l.id),
    );
    return toInvoiceDto(row, returnedByLineId);
  }

  async preview(raw: CreateInvoiceInput): Promise<InvoiceVoucherPreview> {
    const built = await this.buildPosting(raw);
    return this.toPreviewDto(built);
  }

  async previewReturn(
    raw: CreateReturnInvoiceInput,
  ): Promise<InvoiceVoucherPreview> {
    const built = await this.buildReturnPosting(raw);
    return this.toPreviewDto(built);
  }

  async create(raw: CreateInvoiceInput): Promise<Invoice> {
    const built = await this.buildPosting(raw);
    return this.persistInvoice(built, {
      kind: built.input.kind,
      partyId: built.input.partyId,
      dateJalali: built.input.dateJalali,
      description: built.input.description ?? "",
      commissionAmount: built.commissionAmount,
      commissionRate: built.input.commissionRate ?? null,
    });
  }

  async createReturn(raw: CreateReturnInvoiceInput): Promise<Invoice> {
    const built = await this.buildReturnPosting(raw);
    return this.persistInvoice(built, {
      kind: built.returnKind,
      partyId: built.partyId,
      dateJalali: built.input.dateJalali,
      description: built.input.description ?? "",
      commissionAmount: 0n,
      commissionRate: null,
      returnedOfId: built.input.originalInvoiceId,
      returnReason: built.input.returnReason,
      useReturnNumber: true,
    });
  }

  async softDelete(id: string): Promise<Invoice> {
    const row = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        voucher: { include: { lines: true } },
        lines: { include: { product: true, unit: true } },
        returns: { where: { deletedAt: null }, select: { id: true } },
      },
    });
    if (!row) {
      throw new NotFoundException("فاکتور یافت نشد");
    }
    if (row.deletedAt) {
      throw new BadRequestException("فاکتور قبلاً حذف شده است");
    }
    if (row.kind === "SALE_RETURN" || row.kind === "PURCHASE_RETURN") {
      throw new BadRequestException(
        "مرجوعی را نمی‌توان با حذف نرم ابطال کرد",
      );
    }
    if (row.returns.length > 0) {
      throw new BadRequestException(
        "فاکتور دارای مرجوعی است؛ ابتدا مرجوعی‌ها را ابطال کنید",
      );
    }
    if (!row.voucher) {
      throw new BadRequestException("سند مرتبط با فاکتور یافت نشد");
    }

    await this.fiscalYearService.assertWritable(gregorianToJalali(row.date));

    const original = row.voucher;
    const reverseLines = [...original.lines]
      .sort((a, b) => a.lineOrder - b.lineOrder)
      .map((l) => ({
        accountId: l.accountId,
        partyId: l.partyId,
        description: `برگشت: ${l.description}`,
        debit: l.credit,
        credit: l.debit,
        lineOrder: l.lineOrder,
      }));

    const updated = await this.prisma.$transaction(async (tx) => {
      const locked = await tx.invoice.updateMany({
        where: { id, deletedAt: null },
        data: { deletedAt: new Date() },
      });
      if (locked.count !== 1) {
        throw new BadRequestException("فاکتور قبلاً حذف شده است");
      }

      for (const line of row.lines) {
        const baseQty = toBaseQuantity(
          line.quantity,
          line.unit?.conversionFactor ?? 1,
        );
        if (row.kind === "SALE") {
          await tx.product.update({
            where: { id: line.productId },
            data: { stockQty: { increment: baseQty } },
          });
        } else if (row.kind === "PURCHASE") {
          const product = await tx.product.findUniqueOrThrow({
            where: { id: line.productId },
          });
          if (product.stockQty < baseQty) {
            throw new BadRequestException(
              `برگشت خرید: موجودی ${product.name} کافی نیست`,
            );
          }
          await tx.product.update({
            where: { id: line.productId },
            data: { stockQty: { decrement: baseQty } },
          });
        }
      }

      const vSeq = await tx.voucherSequence.upsert({
        where: { id: 1 },
        create: { id: 1, value: 1 },
        update: { value: { increment: 1 } },
      });

      await tx.voucher.create({
        data: {
          number: formatVoucherNumber(vSeq.value),
          kind: "REVERSAL",
          date: original.date,
          description: `برگشت فاکتور ${row.number}`,
          reversedOfId: original.id,
          lines: { create: reverseLines },
        },
      });

      return tx.invoice.findUniqueOrThrow({
        where: { id },
        include: this.include,
      });
    });

    return toInvoiceDto(updated);
  }

  private toPreviewDto(built: {
    description: string;
    totals: InvoiceTotals;
    commissionAmount: bigint;
    cogsTotal: bigint;
    lossTotal: bigint;
    warnings: InvoicePreviewWarning[];
    lines: BuiltLine[];
    totalDebit: bigint;
    totalCredit: bigint;
  }): InvoiceVoucherPreview {
    return InvoiceVoucherPreviewSchema.parse({
      description: built.description,
      subtotal: built.totals.subtotal.toString(),
      vatAmount: built.totals.vatAmount.toString(),
      headerDiscount: built.totals.headerDiscount.toString(),
      commissionAmount: built.commissionAmount.toString(),
      cogsTotal: built.cogsTotal.toString(),
      lossTotal: built.lossTotal.toString(),
      total: built.totals.total.toString(),
      lines: built.lines.map((l) => ({
        accountId: l.accountId,
        accountCode: l.accountCode,
        accountName: l.accountName,
        description: l.description,
        debit: l.debit.toString(),
        credit: l.credit.toString(),
      })),
      warnings: built.warnings,
      totalDebit: built.totalDebit.toString(),
      totalCredit: built.totalCredit.toString(),
    });
  }

  private async persistInvoice(
    built: {
      description: string;
      totals: InvoiceTotals;
      commissionAmount: bigint;
      lines: BuiltLine[];
      stockRows: StockRow[];
      lineRows: LineRow[];
      stockDirection: "sale" | "purchase" | "sale_return" | "purchase_return" | "none";
    },
    meta: {
      kind: InvoiceKind;
      partyId: string;
      dateJalali: string;
      description: string;
      commissionAmount: bigint;
      commissionRate: number | null;
      returnedOfId?: string;
      returnReason?: string;
      useReturnNumber?: boolean;
    },
  ): Promise<Invoice> {
    await this.fiscalYearService.assertWritable(meta.dateJalali);
    const date = jalaliToGregorianDate(meta.dateJalali);

    const created = await this.prisma.$transaction(async (tx) => {
      await this.applyStock(tx, built.stockDirection, built.stockRows);

      const invSeq = await tx.invoiceSequence.upsert({
        where: { id: 1 },
        create: { id: 1, value: 1 },
        update: { value: { increment: 1 } },
      });
      const invoiceNumber = meta.useReturnNumber
        ? formatReturnInvoiceNumber(invSeq.value)
        : formatInvoiceNumber(invSeq.value);

      const vSeq = await tx.voucherSequence.upsert({
        where: { id: 1 },
        create: { id: 1, value: 1 },
        update: { value: { increment: 1 } },
      });

      const voucher = await tx.voucher.create({
        data: {
          number: formatVoucherNumber(vSeq.value),
          kind: "INVOICE",
          date,
          description: built.description,
          lines: {
            create: built.lines.map((line, index) => ({
              accountId: line.accountId,
              partyId: line.partyId ?? null,
              description: line.description,
              debit: line.debit,
              credit: line.credit,
              lineOrder: index,
            })),
          },
        },
      });

      return tx.invoice.create({
        data: {
          number: invoiceNumber,
          kind: meta.kind,
          partyId: meta.partyId,
          date,
          description: meta.description,
          subtotal: built.totals.subtotal,
          vatAmount: built.totals.vatAmount,
          headerDiscount: built.totals.headerDiscount,
          total: built.totals.total,
          commissionAmount: meta.commissionAmount,
          commissionRate: meta.commissionRate,
          returnedOfId: meta.returnedOfId ?? null,
          returnReason: meta.returnReason ?? null,
          voucherId: voucher.id,
          lines: {
            create: built.lineRows.map((line, index) => ({
              productId: line.productId,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              vatRate: line.vatRate,
              discountAmount: line.discountAmount,
              lineNet: line.lineNet,
              lineVat: line.lineVat,
              lineTotal: line.lineTotal,
              lineOrder: index,
              sourceLineId: line.sourceLineId ?? null,
              unitId: line.unitId ?? null,
              catalogUnitPrice: line.catalogUnitPrice ?? null,
            })),
          },
        },
        include: this.include,
      });
    });

    return toInvoiceDto(created);
  }

  private async applyStock(
    tx: Parameters<Parameters<PrismaService["$transaction"]>[0]>[0],
    direction: "sale" | "purchase" | "sale_return" | "purchase_return" | "none",
    stockRows: StockRow[],
  ): Promise<void> {
    if (direction === "none") return;

    for (const row of stockRows) {
      if (direction === "sale") {
        const updated = await tx.product.updateMany({
          where: { id: row.productId, stockQty: { gte: row.baseQuantity } },
          data: { stockQty: { decrement: row.baseQuantity } },
        });
        if (updated.count !== 1) {
          throw new BadRequestException(
            `موجودی کافی برای ${row.productName} نیست`,
          );
        }
      } else if (direction === "purchase" || direction === "sale_return") {
        const product = await tx.product.findUniqueOrThrow({
          where: { id: row.productId },
        });
        const newCost =
          direction === "purchase"
            ? weightedAverageCost(
                product.stockQty,
                product.costPrice,
                row.baseQuantity,
                row.unitPrice,
              )
            : product.costPrice;
        await tx.product.update({
          where: { id: row.productId },
          data: {
            stockQty: { increment: row.baseQuantity },
            ...(direction === "purchase" ? { costPrice: newCost } : {}),
          },
        });
      } else if (direction === "purchase_return") {
        const product = await tx.product.findUniqueOrThrow({
          where: { id: row.productId },
        });
        if (product.stockQty < row.baseQuantity) {
          throw new BadRequestException(
            `موجودی ${row.productName} برای برگشت کافی نیست`,
          );
        }
        await tx.product.update({
          where: { id: row.productId },
          data: { stockQty: { decrement: row.baseQuantity } },
        });
      }
    }
  }

  private async loadReturnedQtyByLine(
    lineIds: string[],
  ): Promise<Map<string, number>> {
    if (lineIds.length === 0) return new Map();
    const rows = await this.prisma.invoiceLine.groupBy({
      by: ["sourceLineId"],
      where: {
        sourceLineId: { in: lineIds },
        invoice: { deletedAt: null },
      },
      _sum: { quantity: true },
    });
    const map = new Map<string, number>();
    for (const row of rows) {
      if (row.sourceLineId) {
        map.set(row.sourceLineId, row._sum.quantity ?? 0);
      }
    }
    return map;
  }

  private async resolveUnitFactors(
    unitIds: string[],
  ): Promise<Map<string, UnitOfMeasure>> {
    const ids = [...new Set(unitIds.filter(Boolean))];
    if (ids.length === 0) return new Map();
    const units = await this.prisma.unitOfMeasure.findMany({
      where: { id: { in: ids } },
    });
    return new Map(units.map((u) => [u.id, u]));
  }

  private baseQtyForLine(
    quantity: number,
    unitId: string | null | undefined,
    unitById: Map<string, UnitOfMeasure>,
  ): number {
    if (!unitId) return quantity;
    const unit = unitById.get(unitId);
    if (!unit) return quantity;
    return toBaseQuantity(quantity, unit.conversionFactor);
  }

  private async buildPosting(raw: CreateInvoiceInput) {
    const input = CreateInvoiceSchema.parse(raw);

    const party = await this.prisma.party.findUnique({
      where: { id: input.partyId },
    });
    if (!party || !party.isActive) {
      throw new BadRequestException("طرف‌حساب معتبر نیست");
    }
    if (input.kind === "SALE" && party.kind !== "CUSTOMER") {
      throw new BadRequestException("فاکتور فروش فقط برای مشتری است");
    }
    if (input.kind === "PURCHASE" && party.kind !== "SUPPLIER") {
      throw new BadRequestException("فاکتور خرید فقط برای تأمین‌کننده است");
    }

    const productIds = [...new Set(input.lines.map((l) => l.productId))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
    });
    const productById = new Map(products.map((p) => [p.id, p]));
    if (products.length !== productIds.length) {
      throw new BadRequestException("یکی از کالاها یافت نشد");
    }
    for (const p of products) {
      if (!p.isActive) {
        throw new BadRequestException(`کالای ${p.sku} غیرفعال است`);
      }
    }

    const unitById = await this.resolveUnitFactors(
      input.lines
        .map((l) => l.unitId ?? productById.get(l.productId)?.defaultUnitId)
        .filter((id): id is string => typeof id === "string"),
    );

    const resolvedLines = input.lines.map((line) => {
      const product = productById.get(line.productId);
      if (!product) {
        throw new BadRequestException("یکی از کالاها یافت نشد");
      }
      const pricing = resolveInvoiceLineUnitPrice(
        {
          unitPrice: product.unitPrice,
          pricingMode: ProductPricingModeSchema.parse(product.pricingMode),
        },
        line.unitPrice,
      );
      return {
        ...line,
        unitPrice: pricing.unitPrice,
        catalogUnitPrice: pricing.catalogUnitPrice,
      };
    });

    const lineRows: LineRow[] = resolvedLines.map((line) => {
      const calc = calcInvoiceLine({
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        vatRate: line.vatRate,
        discountAmount: line.discountAmount,
      });
      const product = productById.get(line.productId);
      if (!product) {
        throw new BadRequestException("یکی از کالاها یافت نشد");
      }
      return {
        productId: line.productId,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        vatRate: line.vatRate,
        discountAmount: calc.discountAmount,
        lineNet: calc.lineNet,
        lineVat: calc.lineVat,
        lineTotal: calc.lineTotal,
        unitId: line.unitId ?? product.defaultUnitId,
        catalogUnitPrice: line.catalogUnitPrice,
      };
    });

    const totals = calcInvoiceTotals(
      resolvedLines.map((l) => ({
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        vatRate: l.vatRate,
        discountAmount: l.discountAmount,
      })),
      input.headerDiscount,
    );

    const commissionRate =
      input.commissionRate ?? party.commissionRate ?? null;
    const commissionAmount = calcCommissionAmount(
      totals.subtotal,
      totals.headerDiscount,
      commissionRate,
      input.commissionAmount,
    );
    if (commissionAmount > totals.total) {
      throw new BadRequestException("مبلغ پورسانت بیش از جمع فاکتور است");
    }

    let cogsTotal = 0n;
    let lossTotal = 0n;
    const warnings: InvoicePreviewWarning[] = [];

    const stockRows: StockRow[] = resolvedLines.map((line, lineIndex) => {
      const product = productById.get(line.productId);
      if (!product) {
        throw new BadRequestException("یکی از کالاها یافت نشد");
      }
      const unitId = line.unitId ?? product.defaultUnitId;
      const baseQuantity = this.baseQtyForLine(line.quantity, unitId, unitById);

      if (input.kind === "SALE") {
        try {
          assertStockAvailable(product.name, product.stockQty, baseQuantity);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "موجودی کافی نیست";
          warnings.push({
            type: "INSUFFICIENT_STOCK",
            lineIndex,
            productName: product.name,
            message,
          });
          throw new BadRequestException(message);
        }

        cogsTotal += lineCogsCost(baseQuantity, product.costPrice);
        const lineLoss = calcLineSaleLoss(
          line.quantity,
          line.unitPrice,
          product.costPrice,
          line.discountAmount,
        );
        if (lineLoss > 0n) {
          lossTotal += lineLoss;
          warnings.push({
            type: "BELOW_COST",
            lineIndex,
            productName: product.name,
            message: `فروش ${product.name} زیر بهای تمام‌شده (${product.costPrice.toString()} ریال)`,
            lossAmount: lineLoss.toString(),
          });
        }
      }

      return {
        productId: line.productId,
        productName: product.name,
        quantity: line.quantity,
        baseQuantity,
        unitPrice: line.unitPrice,
      };
    });

    const accounts = await this.resolvePostingAccounts(input.kind);
    const kindLabel = input.kind === "SALE" ? "فروش" : "خرید";
    const description =
      input.description?.trim() || `فاکتور ${kindLabel} — ${party.name}`;

    const lines =
      input.kind === "SALE"
        ? this.buildSaleLines(
            accounts,
            totals,
            cogsTotal,
            lossTotal,
            commissionAmount,
            description,
            input.partyId,
          )
        : this.buildPurchaseLines(
            accounts,
            totals,
            commissionAmount,
            description,
            input.partyId,
          );

    const totalDebit = lines.reduce((a, l) => a + l.debit, 0n);
    const totalCredit = lines.reduce((a, l) => a + l.credit, 0n);
    if (totalDebit !== totalCredit) {
      throw new BadRequestException("سند فاکتور تراز نیست");
    }

    return {
      input,
      description,
      totals,
      commissionAmount,
      cogsTotal,
      lossTotal,
      warnings,
      lines,
      totalDebit,
      totalCredit,
      stockRows,
      lineRows,
      stockDirection: input.kind === "SALE" ? ("sale" as const) : ("purchase" as const),
    };
  }

  private async buildReturnPosting(raw: CreateReturnInvoiceInput) {
    const input = CreateReturnInvoiceSchema.parse(raw);

    const original = await this.prisma.invoice.findUnique({
      where: { id: input.originalInvoiceId },
      include: {
        party: true,
        lines: { include: { product: true, unit: true } },
      },
    });
    if (!original || original.deletedAt) {
      throw new BadRequestException("فاکتور مبدأ معتبر نیست");
    }
    if (original.kind !== "SALE" && original.kind !== "PURCHASE") {
      throw new BadRequestException("فقط از فاکتور فروش/خرید می‌توان مرجوعی ثبت کرد");
    }

    const returnedByLineId = await this.loadReturnedQtyByLine(
      original.lines.map((l) => l.id),
    );
    const originalLineById = new Map(original.lines.map((l) => [l.id, l]));

    const lineRows: LineRow[] = [];
    const stockRows: StockRow[] = [];
    const calcLines: Array<{
      quantity: number;
      unitPrice: bigint;
      vatRate: number;
      discountAmount?: bigint;
    }> = [];

    for (const req of input.lines) {
      const source = originalLineById.get(req.sourceLineId);
      if (!source) {
        throw new BadRequestException("ردیف مبدأ یافت نشد");
      }
      const already = returnedByLineId.get(source.id) ?? 0;
      const remaining = source.quantity - already;
      if (req.quantity > remaining) {
        throw new BadRequestException(
          `تعداد مرجوعی ${source.product.name} بیش از باقیمانده (${remaining}) است`,
        );
      }

      const amounts = calcReturnLineAmounts(
        source.quantity,
        req.quantity,
        source.unitPrice,
        source.vatRate,
        source.discountAmount,
      );

      lineRows.push({
        productId: source.productId,
        quantity: req.quantity,
        unitPrice: source.unitPrice,
        vatRate: source.vatRate,
        discountAmount: amounts.discountAmount,
        lineNet: amounts.lineNet,
        lineVat: amounts.lineVat,
        lineTotal: amounts.lineTotal,
        sourceLineId: source.id,
        unitId: source.unitId,
      });

      calcLines.push({
        quantity: req.quantity,
        unitPrice: source.unitPrice,
        vatRate: source.vatRate,
        discountAmount: amounts.discountAmount,
      });

      const unitById = source.unit
        ? new Map([[source.unit.id, source.unit]])
        : new Map<string, UnitOfMeasure>();
      const baseQuantity = this.baseQtyForLine(
        req.quantity,
        source.unitId,
        unitById,
      );

      stockRows.push({
        productId: source.productId,
        productName: source.product.name,
        quantity: req.quantity,
        baseQuantity,
        unitPrice: source.unitPrice,
      });
    }

    const rawTotals = calcInvoiceTotals(calcLines, 0n);
    const headerDiscount =
      original.subtotal > 0n
        ? (original.headerDiscount * rawTotals.subtotal) / original.subtotal
        : 0n;
    const totals = calcInvoiceTotals(calcLines, headerDiscount);

    let cogsTotal = 0n;
    if (original.kind === "SALE") {
      for (const row of stockRows) {
        const product = original.lines.find((l) => l.productId === row.productId)
          ?.product;
        if (product) {
          cogsTotal += lineCogsCost(row.baseQuantity, product.costPrice);
        }
      }
    }

    const returnKind = returnKindFor(original.kind);
    const accounts = await this.resolvePostingAccounts(
      original.kind === "SALE" ? "SALE" : "PURCHASE",
    );
    const description =
      input.description?.trim() ||
      `${returnKind === "SALE_RETURN" ? "برگشت از فروش" : "برگشت از خرید"} — ${original.party.name} — ${input.returnReason}`;

    const lines =
      original.kind === "SALE"
        ? this.buildSaleReturnLines(
            accounts,
            totals,
            cogsTotal,
            description,
            original.partyId,
          )
        : this.buildPurchaseReturnLines(
            accounts,
            totals,
            description,
            original.partyId,
          );

    const totalDebit = lines.reduce((a, l) => a + l.debit, 0n);
    const totalCredit = lines.reduce((a, l) => a + l.credit, 0n);
    if (totalDebit !== totalCredit) {
      throw new BadRequestException("سند مرجوعی تراز نیست");
    }

    return {
      input,
      returnKind,
      partyId: original.partyId,
      description,
      totals,
      commissionAmount: 0n,
      cogsTotal,
      lossTotal: 0n,
      warnings: [] as InvoicePreviewWarning[],
      lines,
      totalDebit,
      totalCredit,
      stockRows,
      lineRows,
      stockDirection:
        original.kind === "SALE"
          ? ("sale_return" as const)
          : ("purchase_return" as const),
    };
  }

  private buildSaleLines(
    accounts: PostingAccountMap,
    totals: InvoiceTotals,
    cogsTotal: bigint,
    lossTotal: bigint,
    commissionAmount: bigint,
    description: string,
    partyId: string,
  ): BuiltLine[] {
    const lines: BuiltLine[] = [
      {
        accountId: accounts.receivable.id,
        accountCode: accounts.receivable.code,
        accountName: accounts.receivable.name,
        partyId,
        description,
        debit: totals.total - commissionAmount,
        credit: 0n,
      },
      {
        accountId: accounts.sales.id,
        accountCode: accounts.sales.code,
        accountName: accounts.sales.name,
        description,
        debit: 0n,
        credit: totals.subtotal - totals.headerDiscount,
      },
    ];
    if (commissionAmount > 0n) {
      lines.push({
        accountId: accounts.saleCommission.id,
        accountCode: accounts.saleCommission.code,
        accountName: accounts.saleCommission.name,
        description: `${description} — پورسانت`,
        debit: commissionAmount,
        credit: 0n,
      });
    }
    if (totals.vatAmount > 0n) {
      lines.push({
        accountId: accounts.vatPayable.id,
        accountCode: accounts.vatPayable.code,
        accountName: accounts.vatPayable.name,
        description,
        debit: 0n,
        credit: totals.vatAmount,
      });
    }
    if (cogsTotal > 0n) {
      lines.push(
        {
          accountId: accounts.cogs.id,
          accountCode: accounts.cogs.code,
          accountName: accounts.cogs.name,
          description: `${description} — COGS`,
          debit: cogsTotal,
          credit: 0n,
        },
        {
          accountId: accounts.inventory.id,
          accountCode: accounts.inventory.code,
          accountName: accounts.inventory.name,
          description: `${description} — COGS`,
          debit: 0n,
          credit: cogsTotal,
        },
      );
    }
    if (lossTotal > 0n) {
      lines.push(
        {
          accountId: accounts.saleLoss.id,
          accountCode: accounts.saleLoss.code,
          accountName: accounts.saleLoss.name,
          description: `${description} — زیان فروش`,
          debit: lossTotal,
          credit: 0n,
        },
        {
          accountId: accounts.cogs.id,
          accountCode: accounts.cogs.code,
          accountName: accounts.cogs.name,
          description: `${description} — تعدیل COGS`,
          debit: 0n,
          credit: lossTotal,
        },
      );
    }
    return lines;
  }

  private buildPurchaseLines(
    accounts: PostingAccountMap,
    totals: InvoiceTotals,
    commissionAmount: bigint,
    description: string,
    partyId: string,
  ): BuiltLine[] {
    const lines: BuiltLine[] = [
      {
        accountId: accounts.inventory.id,
        accountCode: accounts.inventory.code,
        accountName: accounts.inventory.name,
        description,
        debit: totals.total,
        credit: 0n,
      },
      {
        accountId: accounts.payable.id,
        accountCode: accounts.payable.code,
        accountName: accounts.payable.name,
        partyId,
        description,
        debit: 0n,
        credit: totals.total - commissionAmount,
      },
    ];
    if (commissionAmount > 0n) {
      lines.push({
        accountId: accounts.purchaseCommission.id,
        accountCode: accounts.purchaseCommission.code,
        accountName: accounts.purchaseCommission.name,
        description: `${description} — پورسانت`,
        debit: 0n,
        credit: commissionAmount,
      });
    }
    return lines;
  }

  private buildSaleReturnLines(
    accounts: PostingAccountMap,
    totals: InvoiceTotals,
    cogsTotal: bigint,
    description: string,
    partyId: string,
  ): BuiltLine[] {
    const lines: BuiltLine[] = [
      {
        accountId: accounts.receivable.id,
        accountCode: accounts.receivable.code,
        accountName: accounts.receivable.name,
        partyId,
        description,
        debit: 0n,
        credit: totals.total,
      },
      {
        accountId: accounts.sales.id,
        accountCode: accounts.sales.code,
        accountName: accounts.sales.name,
        description,
        debit: totals.subtotal - totals.headerDiscount,
        credit: 0n,
      },
    ];
    if (totals.vatAmount > 0n) {
      lines.push({
        accountId: accounts.vatPayable.id,
        accountCode: accounts.vatPayable.code,
        accountName: accounts.vatPayable.name,
        description,
        debit: totals.vatAmount,
        credit: 0n,
      });
    }
    if (cogsTotal > 0n) {
      lines.push(
        {
          accountId: accounts.inventory.id,
          accountCode: accounts.inventory.code,
          accountName: accounts.inventory.name,
          description: `${description} — COGS`,
          debit: cogsTotal,
          credit: 0n,
        },
        {
          accountId: accounts.cogs.id,
          accountCode: accounts.cogs.code,
          accountName: accounts.cogs.name,
          description: `${description} — COGS`,
          debit: 0n,
          credit: cogsTotal,
        },
      );
    }
    return lines;
  }

  private buildPurchaseReturnLines(
    accounts: PostingAccountMap,
    totals: InvoiceTotals,
    description: string,
    partyId: string,
  ): BuiltLine[] {
    return [
      {
        accountId: accounts.inventory.id,
        accountCode: accounts.inventory.code,
        accountName: accounts.inventory.name,
        description,
        debit: 0n,
        credit: totals.total,
      },
      {
        accountId: accounts.payable.id,
        accountCode: accounts.payable.code,
        accountName: accounts.payable.name,
        partyId,
        description,
        debit: totals.total,
        credit: 0n,
      },
    ];
  }

  private async resolvePostingAccounts(
    kind: "SALE" | "PURCHASE",
  ): Promise<PostingAccountMap> {
    const needed =
      kind === "SALE"
        ? [
            INVOICE_POSTING_CODES.receivable,
            INVOICE_POSTING_CODES.sales,
            INVOICE_POSTING_CODES.vatPayable,
            INVOICE_POSTING_CODES.inventory,
            INVOICE_POSTING_CODES.cogs,
            INVOICE_POSTING_CODES.saleLoss,
            INVOICE_POSTING_CODES.saleCommission,
          ]
        : [
            INVOICE_POSTING_CODES.inventory,
            INVOICE_POSTING_CODES.payable,
            INVOICE_POSTING_CODES.purchaseCommission,
          ];

    const rows = await this.prisma.account.findMany({
      where: { code: { in: [...needed] } },
    });
    const byCode = new Map(rows.map((a) => [a.code, a]));

    const pick = (code: string): Account => {
      const a = byCode.get(code);
      if (!a || !a.isActive || a.level !== "DETAIL") {
        throw new BadRequestException(
          `حساب استاندارد ${code} برای ثبت فاکتور یافت نشد`,
        );
      }
      return a;
    };

    if (rows.length === 0) {
      throw new BadRequestException("حساب‌های استاندارد فاکتور یافت نشد");
    }
    const placeholder = rows[0];
    return {
      receivable:
        kind === "SALE" ? pick(INVOICE_POSTING_CODES.receivable) : placeholder,
      payable:
        kind === "PURCHASE" ? pick(INVOICE_POSTING_CODES.payable) : placeholder,
      sales: kind === "SALE" ? pick(INVOICE_POSTING_CODES.sales) : placeholder,
      inventory: pick(INVOICE_POSTING_CODES.inventory),
      vatPayable:
        kind === "SALE" ? pick(INVOICE_POSTING_CODES.vatPayable) : placeholder,
      cogs: kind === "SALE" ? pick(INVOICE_POSTING_CODES.cogs) : placeholder,
      saleLoss:
        kind === "SALE" ? pick(INVOICE_POSTING_CODES.saleLoss) : placeholder,
      saleCommission:
        kind === "SALE"
          ? pick(INVOICE_POSTING_CODES.saleCommission)
          : placeholder,
      purchaseCommission:
        kind === "PURCHASE"
          ? pick(INVOICE_POSTING_CODES.purchaseCommission)
          : placeholder,
    };
  }
}
