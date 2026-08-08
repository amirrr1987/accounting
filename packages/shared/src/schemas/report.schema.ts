import { z } from "zod";
import { AccountTypeSchema } from "./account.schema";

const jalaliDate = z
  .string()
  .regex(/^\d{4}\/\d{2}\/\d{2}$/, "فرمت تاریخ باید YYYY/MM/DD شمسی باشد");

export const ReportRangeQuerySchema = z.object({
  fromJalali: jalaliDate,
  toJalali: jalaliDate,
});
export type ReportRangeQuery = z.infer<typeof ReportRangeQuerySchema>;

export const ReportAsOfQuerySchema = z.object({
  asOfJalali: jalaliDate,
});
export type ReportAsOfQuery = z.infer<typeof ReportAsOfQuerySchema>;

export const PartyStatementQuerySchema = z.object({
  partyId: z.string().uuid(),
  fromJalali: jalaliDate,
  toJalali: jalaliDate,
});
export type PartyStatementQuery = z.infer<typeof PartyStatementQuerySchema>;

export const ReportRowSchema = z.object({
  code: z.string(),
  name: z.string(),
  amount: z.string(),
});
export type ReportRow = z.infer<typeof ReportRowSchema>;

export const ProfitLossReportSchema = z.object({
  fromJalali: z.string(),
  toJalali: z.string(),
  incomeTotal: z.string(),
  expenseTotal: z.string(),
  netProfit: z.string(),
  incomeRows: z.array(ReportRowSchema),
  expenseRows: z.array(ReportRowSchema),
});
export type ProfitLossReport = z.infer<typeof ProfitLossReportSchema>;

export const BalanceSheetSectionSchema = z.object({
  type: AccountTypeSchema,
  label: z.string(),
  total: z.string(),
  rows: z.array(ReportRowSchema),
});
export type BalanceSheetSection = z.infer<typeof BalanceSheetSectionSchema>;

export const BalanceSheetReportSchema = z.object({
  asOfJalali: z.string(),
  assets: z.string(),
  liabilities: z.string(),
  equity: z.string(),
  liabilitiesPlusEquity: z.string(),
  isBalanced: z.boolean(),
  sections: z.array(BalanceSheetSectionSchema),
});
export type BalanceSheetReport = z.infer<typeof BalanceSheetReportSchema>;

export const PartyStatementEntrySchema = z.object({
  dateJalali: z.string(),
  voucherNumber: z.string(),
  description: z.string(),
  debit: z.string(),
  credit: z.string(),
  balance: z.string(),
});
export type PartyStatementEntry = z.infer<typeof PartyStatementEntrySchema>;

export const PartyStatementReportSchema = z.object({
  partyId: z.string().uuid(),
  partyName: z.string(),
  fromJalali: z.string(),
  toJalali: z.string(),
  openingBalance: z.string(),
  closingBalance: z.string(),
  entries: z.array(PartyStatementEntrySchema),
});
export type PartyStatementReport = z.infer<typeof PartyStatementReportSchema>;

export const MonthlyTrendPointSchema = z.object({
  monthLabel: z.string(),
  monthKey: z.string(),
  sales: z.string(),
  purchases: z.string(),
  receipts: z.string(),
  payments: z.string(),
});
export type MonthlyTrendPoint = z.infer<typeof MonthlyTrendPointSchema>;

export const AccountTypeMixSchema = z.object({
  type: AccountTypeSchema,
  label: z.string(),
  amount: z.string(),
});
export type AccountTypeMix = z.infer<typeof AccountTypeMixSchema>;

export const FinancialChartsSchema = z.object({
  monthlyTrend: z.array(MonthlyTrendPointSchema),
  accountTypeMix: z.array(AccountTypeMixSchema),
  arAp: z.object({
    receivable: z.string(),
    payable: z.string(),
  }),
});
export type FinancialCharts = z.infer<typeof FinancialChartsSchema>;

export const VatInvoiceRowSchema = z.object({
  dateJalali: z.string(),
  invoiceNumber: z.string(),
  partyName: z.string(),
  taxableAmount: z.string(),
  vatAmount: z.string(),
  total: z.string(),
});
export type VatInvoiceRow = z.infer<typeof VatInvoiceRowSchema>;

export const VatReportSchema = z.object({
  fromJalali: z.string(),
  toJalali: z.string(),
  /** مالیات فروش (خروجی) */
  outputVat: z.string(),
  /** مالیات خرید (ورودی) */
  inputVat: z.string(),
  /** خالص قابل پرداخت = خروجی − ورودی */
  netPayable: z.string(),
  sales: z.array(VatInvoiceRowSchema),
  purchases: z.array(VatInvoiceRowSchema),
});
export type VatReport = z.infer<typeof VatReportSchema>;

/** آستانه هشدار موجودی کم (تعداد) */
export const LOW_STOCK_THRESHOLD = 5;

export const DashboardManagementSchema = z.object({
  totalCash: z.string(),
  totalBank: z.string(),
  totalInventory: z.string(),
  totalChecks: z.string(),
  grandTotal: z.string(),
  checksDueThisWeek: z.number().int().nonnegative(),
  checksOverdue: z.number().int().nonnegative(),
  lowStockCount: z.number().int().nonnegative(),
  lowStockProducts: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      sku: z.string(),
      stockQty: z.number().int(),
    }),
  ),
  periodSaleLoss: z.string(),
  periodOwnerDrawings: z.string(),
});
export type DashboardManagement = z.infer<typeof DashboardManagementSchema>;

export const CashFlowRowSchema = z.object({
  dateJalali: z.string(),
  kind: z.string(),
  reference: z.string(),
  description: z.string(),
  inflow: z.string(),
  outflow: z.string(),
  balance: z.string(),
});
export type CashFlowRow = z.infer<typeof CashFlowRowSchema>;

export const CashFlowReportSchema = z.object({
  fromJalali: z.string(),
  toJalali: z.string(),
  openingBalance: z.string(),
  closingBalance: z.string(),
  totalInflow: z.string(),
  totalOutflow: z.string(),
  netChange: z.string(),
  rows: z.array(CashFlowRowSchema),
});
export type CashFlowReport = z.infer<typeof CashFlowReportSchema>;

export const CheckReportRowSchema = z.object({
  id: z.string().uuid(),
  sayyadNumber: z.string(),
  kind: z.enum(["RECEIVABLE", "PAYABLE"]),
  status: z.string(),
  issueJalali: z.string(),
  dueJalali: z.string(),
  amount: z.string(),
  partyName: z.string(),
  bankName: z.string(),
});
export type CheckReportRow = z.infer<typeof CheckReportRowSchema>;

export const CheckReportSchema = z.object({
  fromJalali: z.string(),
  toJalali: z.string(),
  totalReceivable: z.string(),
  totalPayable: z.string(),
  dueThisWeek: z.number().int().nonnegative(),
  overdue: z.number().int().nonnegative(),
  rows: z.array(CheckReportRowSchema),
});
export type CheckReport = z.infer<typeof CheckReportSchema>;

export const InventoryKardexQuerySchema = z.object({
  productId: z.string().uuid(),
  fromJalali: jalaliDate,
  toJalali: jalaliDate,
});
export type InventoryKardexQuery = z.infer<typeof InventoryKardexQuerySchema>;

export const InventoryKardexEntrySchema = z.object({
  dateJalali: z.string(),
  kind: z.string(),
  reference: z.string(),
  description: z.string(),
  quantityIn: z.number().int().nonnegative(),
  quantityOut: z.number().int().nonnegative(),
  balanceQty: z.number().int(),
});
export type InventoryKardexEntry = z.infer<typeof InventoryKardexEntrySchema>;

export const InventoryKardexReportSchema = z.object({
  productId: z.string().uuid(),
  productName: z.string(),
  sku: z.string(),
  fromJalali: z.string(),
  toJalali: z.string(),
  openingQty: z.number().int(),
  closingQty: z.number().int(),
  entries: z.array(InventoryKardexEntrySchema),
});
export type InventoryKardexReport = z.infer<typeof InventoryKardexReportSchema>;

export const OwnerStatusRowSchema = z.object({
  ownerId: z.string().uuid(),
  ownerName: z.string(),
  drawingCount: z.number().int().nonnegative(),
  totalDrawings: z.string(),
});
export type OwnerStatusRow = z.infer<typeof OwnerStatusRowSchema>;

export const OwnerStatusReportSchema = z.object({
  fromJalali: z.string(),
  toJalali: z.string(),
  grandTotal: z.string(),
  rows: z.array(OwnerStatusRowSchema),
});
export type OwnerStatusReport = z.infer<typeof OwnerStatusReportSchema>;

/** برچسب فارسی نوع حساب برای نمودار */
export const ACCOUNT_TYPE_LABELS: Record<
  z.infer<typeof AccountTypeSchema>,
  string
> = {
  ASSET: "دارایی",
  LIABILITY: "بدهی",
  EQUITY: "حقوق صاحبان سهام",
  INCOME: "درآمد",
  EXPENSE: "هزینه",
};
