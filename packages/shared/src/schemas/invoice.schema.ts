import { z } from "zod";
import { MoneySchema } from "./voucher.schema";

export const PartyKindSchema = z.enum(["CUSTOMER", "SUPPLIER"]);
export type PartyKind = z.infer<typeof PartyKindSchema>;

export const PartySchema = z.object({
  id: z.string().uuid(),
  kind: PartyKindSchema,
  name: z.string().min(1).max(200),
  phone: z.string().max(32).nullable(),
  nationalId: z.string().max(20).nullable(),
  commissionRate: z.number().min(0).max(1).nullable(),
  isActive: z.boolean(),
  createdAt: z.string().datetime().optional(),
});
export type Party = z.infer<typeof PartySchema>;

export const CreatePartySchema = z.object({
  kind: PartyKindSchema,
  name: z.string().min(1).max(200),
  phone: z.string().max(32).nullable().optional(),
  nationalId: z.string().max(20).nullable().optional(),
  commissionRate: z.number().min(0).max(1).nullable().optional(),
  isActive: z.boolean().optional().default(true),
});
export type CreatePartyInput = z.infer<typeof CreatePartySchema>;

export const PartyListSchema = z.array(PartySchema);

export const ProductPricingModeSchema = z.enum(["FIXED", "AT_INVOICE"]);
export type ProductPricingMode = z.infer<typeof ProductPricingModeSchema>;

export const PRODUCT_PRICING_MODE_LABELS: Record<ProductPricingMode, string> = {
  FIXED: "قیمت ثابت",
  AT_INVOICE: "قیمت در لحظه ثبت فاکتور",
};

export const ProductSchema = z.object({
  id: z.string().uuid(),
  sku: z.string().min(1).max(64),
  name: z.string().min(1).max(200),
  unitPrice: z.string(),
  costPrice: z.string(),
  stockQty: z.number().int().nonnegative(),
  vatRate: z.number().min(0).max(1),
  pricingMode: ProductPricingModeSchema,
  defaultUnitId: z.string().uuid().nullable(),
  defaultUnitNameFa: z.string().nullable().optional(),
  isActive: z.boolean(),
});
export type Product = z.infer<typeof ProductSchema>;

export const CreateProductSchema = z.object({
  sku: z.string().min(1).max(64),
  name: z.string().min(1).max(200),
  unitPrice: MoneySchema,
  costPrice: MoneySchema.optional().default(0n),
  stockQty: z.number().int().nonnegative().optional().default(0),
  vatRate: z.number().min(0).max(1).default(0.09),
  pricingMode: ProductPricingModeSchema.optional().default("AT_INVOICE"),
  defaultUnitId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional().default(true),
});
export type CreateProductInput = z.infer<typeof CreateProductSchema>;

/** تعیین قیمت واحد ردیف فاکتور بر اساس سیاست قیمت‌گذاری کالا */
export function resolveInvoiceLineUnitPrice(
  product: { unitPrice: bigint; pricingMode: ProductPricingMode },
  requested: bigint,
): { unitPrice: bigint; catalogUnitPrice: bigint } {
  const catalog = product.unitPrice;
  if (product.pricingMode === "FIXED") {
    return { unitPrice: catalog, catalogUnitPrice: catalog };
  }
  return { unitPrice: requested, catalogUnitPrice: catalog };
}

export const ProductListSchema = z.array(ProductSchema);

export const InvoiceKindSchema = z.enum([
  "SALE",
  "PURCHASE",
  "SALE_RETURN",
  "PURCHASE_RETURN",
]);
export type InvoiceKind = z.infer<typeof InvoiceKindSchema>;

export const INVOICE_KIND_LABELS: Record<InvoiceKind, string> = {
  SALE: "فروش",
  PURCHASE: "خرید",
  SALE_RETURN: "برگشت از فروش",
  PURCHASE_RETURN: "برگشت از خرید",
};

export function isReturnKind(kind: InvoiceKind): boolean {
  return kind === "SALE_RETURN" || kind === "PURCHASE_RETURN";
}

export function isSaleDirection(kind: InvoiceKind): boolean {
  return kind === "SALE" || kind === "SALE_RETURN";
}

export function returnKindFor(original: "SALE" | "PURCHASE"): InvoiceKind {
  return original === "SALE" ? "SALE_RETURN" : "PURCHASE_RETURN";
}

export const InvoiceLineInputSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  unitPrice: MoneySchema,
  vatRate: z.number().min(0).max(1),
  discountAmount: MoneySchema.optional().default(0n),
  unitId: z.string().uuid().nullable().optional(),
});
export type InvoiceLineInput = z.infer<typeof InvoiceLineInputSchema>;

export const CreateInvoiceSchema = z.object({
  kind: z.enum(["SALE", "PURCHASE"]),
  partyId: z.string().uuid(),
  dateJalali: z.string().regex(/^\d{4}\/\d{2}\/\d{2}$/),
  description: z.string().max(1000).optional().default(""),
  headerDiscount: MoneySchema.optional().default(0n),
  commissionAmount: MoneySchema.optional().default(0n),
  commissionRate: z.number().min(0).max(1).nullable().optional(),
  lines: z.array(InvoiceLineInputSchema).min(1),
});
export type CreateInvoiceInput = z.infer<typeof CreateInvoiceSchema>;

export const ReturnLineInputSchema = z.object({
  sourceLineId: z.string().uuid(),
  quantity: z.number().int().positive(),
});
export type ReturnLineInput = z.infer<typeof ReturnLineInputSchema>;

export const CreateReturnInvoiceSchema = z.object({
  originalInvoiceId: z.string().uuid(),
  dateJalali: z.string().regex(/^\d{4}\/\d{2}\/\d{2}$/),
  returnReason: z.string().min(1).max(500),
  description: z.string().max(1000).optional().default(""),
  lines: z.array(ReturnLineInputSchema).min(1),
});
export type CreateReturnInvoiceInput = z.infer<typeof CreateReturnInvoiceSchema>;

export const InvoiceLineSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  productName: z.string(),
  quantity: z.number().int(),
  unitPrice: z.string(),
  catalogUnitPrice: z.string().nullable().optional(),
  vatRate: z.number(),
  discountAmount: z.string(),
  lineNet: z.string(),
  lineVat: z.string(),
  lineTotal: z.string(),
  sourceLineId: z.string().uuid().nullable(),
  unitId: z.string().uuid().nullable(),
  unitNameFa: z.string().nullable().optional(),
  returnedQty: z.number().int().nonnegative().optional(),
  remainingQty: z.number().int().nonnegative().optional(),
});
export type InvoiceLine = z.infer<typeof InvoiceLineSchema>;

export const InvoiceSchema = z.object({
  id: z.string().uuid(),
  number: z.string(),
  kind: InvoiceKindSchema,
  partyId: z.string().uuid(),
  partyName: z.string(),
  dateJalali: z.string(),
  description: z.string(),
  subtotal: z.string(),
  vatAmount: z.string(),
  headerDiscount: z.string(),
  total: z.string(),
  commissionAmount: z.string(),
  commissionRate: z.number().nullable(),
  returnedOfId: z.string().uuid().nullable(),
  returnReason: z.string().nullable(),
  originalInvoiceNumber: z.string().nullable().optional(),
  voucherId: z.string().uuid().nullable(),
  voucherNumber: z.string().nullable(),
  deletedAt: z.string().datetime().nullable(),
  lines: z.array(InvoiceLineSchema),
});
export type Invoice = z.infer<typeof InvoiceSchema>;

export const InvoiceListSchema = z.array(InvoiceSchema);

export const InvoiceVoucherPreviewLineSchema = z.object({
  accountId: z.string().uuid(),
  accountCode: z.string(),
  accountName: z.string(),
  description: z.string(),
  debit: z.string(),
  credit: z.string(),
});
export type InvoiceVoucherPreviewLine = z.infer<
  typeof InvoiceVoucherPreviewLineSchema
>;

export const InvoicePreviewWarningSchema = z.object({
  type: z.enum(["INSUFFICIENT_STOCK", "BELOW_COST"]),
  lineIndex: z.number().int().nonnegative(),
  productName: z.string(),
  message: z.string(),
  lossAmount: z.string().optional(),
});
export type InvoicePreviewWarning = z.infer<typeof InvoicePreviewWarningSchema>;

export const InvoiceVoucherPreviewSchema = z.object({
  description: z.string(),
  subtotal: z.string(),
  vatAmount: z.string(),
  headerDiscount: z.string(),
  commissionAmount: z.string(),
  cogsTotal: z.string(),
  lossTotal: z.string(),
  total: z.string(),
  lines: z.array(InvoiceVoucherPreviewLineSchema),
  warnings: z.array(InvoicePreviewWarningSchema),
  totalDebit: z.string(),
  totalCredit: z.string(),
});
export type InvoiceVoucherPreview = z.infer<typeof InvoiceVoucherPreviewSchema>;

export function calcInvoiceLine(line: {
  quantity: number;
  unitPrice: bigint;
  vatRate: number;
  discountAmount?: bigint;
}): {
  lineGross: bigint;
  discountAmount: bigint;
  lineNet: bigint;
  lineVat: bigint;
  lineTotal: bigint;
} {
  const lineGross = line.unitPrice * BigInt(line.quantity);
  const discount = line.discountAmount ?? 0n;
  const lineNet = lineGross > discount ? lineGross - discount : 0n;
  const lineVat = BigInt(Math.round(Number(lineNet) * line.vatRate));
  return {
    lineGross,
    discountAmount: lineGross > discount ? discount : lineGross,
    lineNet,
    lineVat,
    lineTotal: lineNet + lineVat,
  };
}

export function calcReturnLineAmounts(
  originalQty: number,
  returnQty: number,
  unitPrice: bigint,
  vatRate: number,
  originalDiscount: bigint,
): ReturnType<typeof calcInvoiceLine> {
  const proportionalDiscount =
    originalQty > 0
      ? (originalDiscount * BigInt(returnQty)) / BigInt(originalQty)
      : 0n;
  return calcInvoiceLine({
    quantity: returnQty,
    unitPrice,
    vatRate,
    discountAmount: proportionalDiscount,
  });
}

export function calcInvoiceTotals(
  lines: Array<{
    quantity: number;
    unitPrice: bigint;
    vatRate: number;
    discountAmount?: bigint;
  }>,
  headerDiscount = 0n,
): {
  subtotal: bigint;
  vatAmount: bigint;
  headerDiscount: bigint;
  total: bigint;
} {
  let subtotal = 0n;
  let vatAmount = 0n;
  for (const line of lines) {
    const c = calcInvoiceLine(line);
    subtotal += c.lineNet;
    vatAmount += c.lineVat;
  }
  const appliedHeader =
    headerDiscount > subtotal + vatAmount
      ? subtotal + vatAmount
      : headerDiscount;
  const total = subtotal + vatAmount - appliedHeader;
  return {
    subtotal,
    vatAmount,
    headerDiscount: appliedHeader,
    total: total >= 0n ? total : 0n,
  };
}

export function calcCommissionAmount(
  subtotal: bigint,
  headerDiscount: bigint,
  commissionRate?: number | null,
  explicitAmount?: bigint,
): bigint {
  if (explicitAmount !== undefined && explicitAmount > 0n) {
    return explicitAmount;
  }
  if (commissionRate !== undefined && commissionRate !== null && commissionRate > 0) {
    const base = subtotal > headerDiscount ? subtotal - headerDiscount : 0n;
    return BigInt(Math.round(Number(base) * commissionRate));
  }
  return 0n;
}

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
function toPersianDigits(value: string): string {
  return value.replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)] ?? d);
}

export function formatInvoiceNumber(seq: number): string {
  return `فاکتور-${toPersianDigits(String(seq).padStart(4, "0"))}`;
}

export function formatReturnInvoiceNumber(seq: number): string {
  return `مرجوعی-${toPersianDigits(String(seq).padStart(4, "0"))}`;
}

export const INVOICE_POSTING_CODES = {
  receivable: "11201",
  payable: "21101",
  sales: "41101",
  purchaseCommission: "41102",
  inventory: "11301",
  vatPayable: "21201",
  cogs: "51201",
  saleLoss: "51202",
  saleCommission: "51104",
} as const;
