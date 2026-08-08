import type {
  Account,
  Invoice as PrismaInvoice,
  InvoiceLine as PrismaLine,
  Party,
  Product,
  UnitOfMeasure,
  Voucher,
} from "@prisma/client";
import {
  InvoiceSchema,
  gregorianToJalali,
  type Invoice,
} from "@hesabyar/shared";

type InvoiceRow = PrismaInvoice & {
  party: Party;
  voucher: Voucher | null;
  returnedOf?: { number: string } | null;
  lines: Array<
    PrismaLine & {
      product: Product;
      unit?: UnitOfMeasure | null;
    }
  >;
};

export function toInvoiceDto(
  row: InvoiceRow,
  returnedByLineId?: Map<string, number>,
): Invoice {
  const lines = [...row.lines].sort((a, b) => a.lineOrder - b.lineOrder);
  return InvoiceSchema.parse({
    id: row.id,
    number: row.number,
    kind: row.kind,
    partyId: row.partyId,
    partyName: row.party.name,
    dateJalali: gregorianToJalali(row.date),
    description: row.description,
    subtotal: row.subtotal.toString(),
    vatAmount: row.vatAmount.toString(),
    headerDiscount: row.headerDiscount.toString(),
    total: row.total.toString(),
    commissionAmount: row.commissionAmount.toString(),
    commissionRate: row.commissionRate,
    returnedOfId: row.returnedOfId,
    returnReason: row.returnReason,
    originalInvoiceNumber: row.returnedOf?.number ?? null,
    voucherId: row.voucherId,
    voucherNumber: row.voucher?.number ?? null,
    deletedAt: row.deletedAt?.toISOString() ?? null,
    lines: lines.map((l) => {
      const returnedQty = returnedByLineId?.get(l.id) ?? 0;
      return {
        id: l.id,
        productId: l.productId,
        productName: l.product.name,
        quantity: l.quantity,
        unitPrice: l.unitPrice.toString(),
        catalogUnitPrice: l.catalogUnitPrice?.toString() ?? null,
        vatRate: l.vatRate,
        discountAmount: l.discountAmount.toString(),
        lineNet: l.lineNet.toString(),
        lineVat: l.lineVat.toString(),
        lineTotal: l.lineTotal.toString(),
        sourceLineId: l.sourceLineId,
        unitId: l.unitId,
        unitNameFa: l.unit?.nameFa ?? null,
        returnedQty,
        remainingQty: Math.max(0, l.quantity - returnedQty),
      };
    }),
  });
}

export type PostingAccountMap = {
  receivable: Account;
  payable: Account;
  sales: Account;
  inventory: Account;
  vatPayable: Account;
  cogs: Account;
  saleLoss: Account;
  saleCommission: Account;
  purchaseCommission: Account;
};
