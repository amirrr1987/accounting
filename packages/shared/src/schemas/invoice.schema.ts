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
  isActive: z.boolean(),
  createdAt: z.string().datetime().optional(),
});
export type Party = z.infer<typeof PartySchema>;

export const CreatePartySchema = z.object({
  kind: PartyKindSchema,
  name: z.string().min(1).max(200),
  phone: z.string().max(32).nullable().optional(),
  nationalId: z.string().max(20).nullable().optional(),
  isActive: z.boolean().optional().default(true),
});
export type CreatePartyInput = z.infer<typeof CreatePartySchema>;

export const PartyListSchema = z.array(PartySchema);

export const ProductSchema = z.object({
  id: z.string().uuid(),
  sku: z.string().min(1).max(64),
  name: z.string().min(1).max(200),
  /** قیمت فروش واحد به ریال */
  unitPrice: z.string(),
  /** میانگین بهای تمام‌شده واحد */
  costPrice: z.string(),
  /** موجودی انبار */
  stockQty: z.number().int().nonnegative(),
  /** نرخ مالیات، مثلاً 0.09 برای ۹٪ */
  vatRate: z.number().min(0).max(1),
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
  isActive: z.boolean().optional().default(true),
});
export type CreateProductInput = z.infer<typeof CreateProductSchema>;

export const ProductListSchema = z.array(ProductSchema);

export const InvoiceKindSchema = z.enum(["SALE", "PURCHASE"]);
export type InvoiceKind = z.infer<typeof InvoiceKindSchema>;

export const InvoiceLineInputSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  unitPrice: MoneySchema,
  vatRate: z.number().min(0).max(1),
  /** تخفیف ردیف به ریال */
  discountAmount: MoneySchema.optional().default(0n),
});
export type InvoiceLineInput = z.infer<typeof InvoiceLineInputSchema>;

export const CreateInvoiceSchema = z.object({
  kind: InvoiceKindSchema,
  partyId: z.string().uuid(),
  dateJalali: z
    .string()
    .regex(/^\d{4}\/\d{2}\/\d{2}$/),
  description: z.string().max(1000).optional().default(""),
  /** تخفیف سر فاکتور به ریال */
  headerDiscount: MoneySchema.optional().default(0n),
  lines: z.array(InvoiceLineInputSchema).min(1),
});
export type CreateInvoiceInput = z.infer<typeof CreateInvoiceSchema>;

export const InvoiceLineSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  productName: z.string(),
  quantity: z.number().int(),
  unitPrice: z.string(),
  vatRate: z.number(),
  discountAmount: z.string(),
  lineNet: z.string(),
  lineVat: z.string(),
  lineTotal: z.string(),
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
  voucherId: z.string().uuid().nullable(),
  voucherNumber: z.string().nullable(),
  deletedAt: z.string().datetime().nullable(),
  lines: z.array(InvoiceLineSchema),
});
export type Invoice = z.infer<typeof InvoiceSchema>;

export const InvoiceListSchema = z.array(InvoiceSchema);

/** پیش‌نمایش سند خودکار قبل از تأیید فاکتور */
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

export const InvoiceVoucherPreviewSchema = z.object({
  description: z.string(),
  subtotal: z.string(),
  vatAmount: z.string(),
  headerDiscount: z.string(),
  cogsTotal: z.string(),
  total: z.string(),
  lines: z.array(InvoiceVoucherPreviewLineSchema),
  totalDebit: z.string(),
  totalCredit: z.string(),
});
export type InvoiceVoucherPreview = z.infer<typeof InvoiceVoucherPreviewSchema>;

/** محاسبه مبالغ یک ردیف فاکتور (پس از تخفیف ردیف) */
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
  const lineNet =
    lineGross > discount ? lineGross - discount : 0n;
  const lineVat = BigInt(Math.round(Number(lineNet) * line.vatRate));
  return {
    lineGross,
    discountAmount: lineGross > discount ? discount : lineGross,
    lineNet,
    lineVat,
    lineTotal: lineNet + lineVat,
  };
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

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
function toPersianDigits(value: string): string {
  return value.replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)] ?? d);
}

export function formatInvoiceNumber(seq: number): string {
  return `فاکتور-${toPersianDigits(String(seq).padStart(4, "0"))}`;
}

/** کد حساب‌های استاندارد برای ثبت خودکار سند فاکتور */
export const INVOICE_POSTING_CODES = {
  receivable: "11201",
  payable: "21101",
  sales: "41101",
  inventory: "11301",
  vatPayable: "21201",
  cogs: "51201",
} as const;
