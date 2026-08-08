import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  CreateInvoiceSchema,
  INVOICE_POSTING_CODES,
  calcInvoiceLine,
  calcInvoiceTotals,
  formatInvoiceNumber,
  formatVoucherNumber,
  gregorianToJalali,
  jalaliToGregorianDate,
  InvoiceVoucherPreviewSchema,
  lineCogsCost,
  weightedAverageCost,
  type CreateInvoiceInput,
  type Invoice,
  type InvoiceVoucherPreview,
} from "@hesabyar/shared";
import type { Account } from "@prisma/client";
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

@Injectable()
export class InvoiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fiscalYearService: FiscalYearService,
  ) {}

  private readonly include = {
    party: true,
    voucher: true,
    lines: { include: { product: true } },
  } as const;

  async findAll(): Promise<Invoice[]> {
    const rows = await this.prisma.invoice.findMany({
      include: this.include,
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toInvoiceDto);
  }

  async findOne(id: string): Promise<Invoice> {
    const row = await this.prisma.invoice.findUnique({
      where: { id },
      include: this.include,
    });
    if (!row) {
      throw new NotFoundException("فاکتور یافت نشد");
    }
    return toInvoiceDto(row);
  }

  async preview(raw: CreateInvoiceInput): Promise<InvoiceVoucherPreview> {
    const built = await this.buildPosting(raw);
    return InvoiceVoucherPreviewSchema.parse({
      description: built.description,
      subtotal: built.totals.subtotal.toString(),
      vatAmount: built.totals.vatAmount.toString(),
      headerDiscount: built.totals.headerDiscount.toString(),
      cogsTotal: built.cogsTotal.toString(),
      total: built.totals.total.toString(),
      lines: built.lines.map((l) => ({
        accountId: l.accountId,
        accountCode: l.accountCode,
        accountName: l.accountName,
        description: l.description,
        debit: l.debit.toString(),
        credit: l.credit.toString(),
      })),
      totalDebit: built.totalDebit.toString(),
      totalCredit: built.totalCredit.toString(),
    });
  }

  async create(raw: CreateInvoiceInput): Promise<Invoice> {
    const built = await this.buildPosting(raw);
    await this.fiscalYearService.assertWritable(built.input.dateJalali);
    const date = jalaliToGregorianDate(built.input.dateJalali);

    const created = await this.prisma.$transaction(async (tx) => {
      if (built.input.kind === "SALE") {
        for (const row of built.stockRows) {
          const updated = await tx.product.updateMany({
            where: { id: row.productId, stockQty: { gte: row.quantity } },
            data: { stockQty: { decrement: row.quantity } },
          });
          if (updated.count !== 1) {
            throw new BadRequestException(
              `موجودی کافی برای ${row.productName} نیست`,
            );
          }
        }
      } else {
        for (const row of built.stockRows) {
          const product = await tx.product.findUniqueOrThrow({
            where: { id: row.productId },
          });
          const newCost = weightedAverageCost(
            product.stockQty,
            product.costPrice,
            row.quantity,
            row.unitPrice,
          );
          await tx.product.update({
            where: { id: row.productId },
            data: {
              stockQty: { increment: row.quantity },
              costPrice: newCost,
            },
          });
        }
      }

      const invSeq = await tx.invoiceSequence.upsert({
        where: { id: 1 },
        create: { id: 1, value: 1 },
        update: { value: { increment: 1 } },
      });
      const invoiceNumber = formatInvoiceNumber(invSeq.value);

      const vSeq = await tx.voucherSequence.upsert({
        where: { id: 1 },
        create: { id: 1, value: 1 },
        update: { value: { increment: 1 } },
      });
      const voucherNumber = formatVoucherNumber(vSeq.value);

      const voucher = await tx.voucher.create({
        data: {
          number: voucherNumber,
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
          kind: built.input.kind,
          partyId: built.input.partyId,
          date,
          description: built.input.description ?? "",
          subtotal: built.totals.subtotal,
          vatAmount: built.totals.vatAmount,
          headerDiscount: built.totals.headerDiscount,
          total: built.totals.total,
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
            })),
          },
        },
        include: this.include,
      });
    });

    return toInvoiceDto(created);
  }

  async softDelete(id: string): Promise<Invoice> {
    const row = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        voucher: { include: { lines: true } },
        lines: { include: { product: true } },
      },
    });
    if (!row) {
      throw new NotFoundException("فاکتور یافت نشد");
    }
    if (row.deletedAt) {
      throw new BadRequestException("فاکتور قبلاً حذف شده است");
    }
    if (!row.voucher) {
      throw new BadRequestException("سند مرتبط با فاکتور یافت نشد");
    }

    await this.fiscalYearService.assertWritable(
      gregorianToJalali(row.date),
    );

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
      // stock reversal
      for (const line of row.lines) {
        if (row.kind === "SALE") {
          await tx.product.update({
            where: { id: line.productId },
            data: { stockQty: { increment: line.quantity } },
          });
        } else {
          const product = await tx.product.findUniqueOrThrow({
            where: { id: line.productId },
          });
          if (product.stockQty < line.quantity) {
            throw new BadRequestException(
              `برگشت خرید: موجودی ${product.name} کافی نیست`,
            );
          }
          await tx.product.update({
            where: { id: line.productId },
            data: { stockQty: { decrement: line.quantity } },
          });
        }
      }

      const vSeq = await tx.voucherSequence.upsert({
        where: { id: 1 },
        create: { id: 1, value: 1 },
        update: { value: { increment: 1 } },
      });
      const voucherNumber = formatVoucherNumber(vSeq.value);

      await tx.voucher.create({
        data: {
          number: voucherNumber,
          kind: "REVERSAL",
          date: original.date,
          description: `برگشت فاکتور ${row.number}`,
          reversedOfId: original.id,
          lines: { create: reverseLines },
        },
      });

      return tx.invoice.update({
        where: { id },
        data: { deletedAt: new Date() },
        include: this.include,
      });
    });

    return toInvoiceDto(updated);
  }

  private async buildPosting(raw: CreateInvoiceInput): Promise<{
    input: ReturnType<typeof CreateInvoiceSchema.parse>;
    description: string;
    totals: InvoiceTotals;
    cogsTotal: bigint;
    lines: BuiltLine[];
    totalDebit: bigint;
    totalCredit: bigint;
    stockRows: Array<{
      productId: string;
      productName: string;
      quantity: number;
      unitPrice: bigint;
    }>;
    lineRows: Array<{
      productId: string;
      quantity: number;
      unitPrice: bigint;
      vatRate: number;
      discountAmount: bigint;
      lineNet: bigint;
      lineVat: bigint;
      lineTotal: bigint;
    }>;
  }> {
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

    const lineRows = input.lines.map((line) => {
      const calc = calcInvoiceLine({
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        vatRate: line.vatRate,
        discountAmount: line.discountAmount,
      });
      return {
        productId: line.productId,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        vatRate: line.vatRate,
        discountAmount: calc.discountAmount,
        lineNet: calc.lineNet,
        lineVat: calc.lineVat,
        lineTotal: calc.lineTotal,
      };
    });

    const totals = calcInvoiceTotals(
      input.lines.map((l) => ({
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        vatRate: l.vatRate,
        discountAmount: l.discountAmount,
      })),
      input.headerDiscount,
    );

    let cogsTotal = 0n;
    const stockRows = input.lines.map((line) => {
      const product = productById.get(line.productId)!;
      if (input.kind === "SALE") {
        if (product.stockQty < line.quantity) {
          throw new BadRequestException(
            `موجودی ${product.name} (${product.stockQty}) کمتر از ${line.quantity} است`,
          );
        }
        cogsTotal += lineCogsCost(line.quantity, product.costPrice);
      }
      return {
        productId: line.productId,
        productName: product.name,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
      };
    });

    const accounts = await this.resolvePostingAccounts(input.kind);
    const kindLabel = input.kind === "SALE" ? "فروش" : "خرید";
    const description =
      input.description?.trim() ||
      `فاکتور ${kindLabel} — ${party.name}`;

    const lines =
      input.kind === "SALE"
        ? this.buildSaleLines(
            accounts,
            totals,
            cogsTotal,
            description,
            input.partyId,
          )
        : this.buildPurchaseLines(accounts, totals, description, input.partyId);

    const totalDebit = lines.reduce((a, l) => a + l.debit, 0n);
    const totalCredit = lines.reduce((a, l) => a + l.credit, 0n);
    if (totalDebit !== totalCredit) {
      throw new BadRequestException("سند فاکتور تراز نیست");
    }

    return {
      input,
      description,
      totals,
      cogsTotal,
      lines,
      totalDebit,
      totalCredit,
      stockRows,
      lineRows,
    };
  }

  private buildSaleLines(
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
        debit: totals.total,
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
    return lines;
  }

  private buildPurchaseLines(
    accounts: PostingAccountMap,
    totals: InvoiceTotals,
    description: string,
    partyId: string,
  ): BuiltLine[] {
    void totals.subtotal;
    void totals.vatAmount;
    return [
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
        credit: totals.total,
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
          ]
        : [
            INVOICE_POSTING_CODES.inventory,
            INVOICE_POSTING_CODES.payable,
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

    const placeholder = rows[0]!;
    return {
      receivable:
        kind === "SALE" ? pick(INVOICE_POSTING_CODES.receivable) : placeholder,
      payable:
        kind === "PURCHASE" ? pick(INVOICE_POSTING_CODES.payable) : placeholder,
      sales: kind === "SALE" ? pick(INVOICE_POSTING_CODES.sales) : placeholder,
      inventory:
        kind === "SALE" || kind === "PURCHASE"
          ? pick(INVOICE_POSTING_CODES.inventory)
          : placeholder,
      vatPayable:
        kind === "SALE" ? pick(INVOICE_POSTING_CODES.vatPayable) : placeholder,
      cogs: kind === "SALE" ? pick(INVOICE_POSTING_CODES.cogs) : placeholder,
    };
  }
}
