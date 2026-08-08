import type {
  Account,
  Invoice as PrismaInvoice,
  InvoiceLine as PrismaLine,
  Party,
  Product,
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
  lines: Array<PrismaLine & { product: Product }>;
};

export function toInvoiceDto(row: InvoiceRow): Invoice {
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
    voucherId: row.voucherId,
    voucherNumber: row.voucher?.number ?? null,
    deletedAt: row.deletedAt?.toISOString() ?? null,
    lines: lines.map((l) => ({
      id: l.id,
      productId: l.productId,
      productName: l.product.name,
      quantity: l.quantity,
      unitPrice: l.unitPrice.toString(),
      vatRate: l.vatRate,
      discountAmount: l.discountAmount.toString(),
      lineNet: l.lineNet.toString(),
      lineVat: l.lineVat.toString(),
      lineTotal: l.lineTotal.toString(),
    })),
  });
}

export type PostingAccountMap = {
  receivable: Account;
  payable: Account;
  sales: Account;
  inventory: Account;
  vatPayable: Account;
  cogs: Account;
};
