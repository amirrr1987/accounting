import { z } from "zod";

export const DashboardRecentVoucherSchema = z.object({
  id: z.string().uuid(),
  number: z.string(),
  dateJalali: z.string(),
  description: z.string(),
  totalDebit: z.string(),
});
export type DashboardRecentVoucher = z.infer<
  typeof DashboardRecentVoucherSchema
>;

export const DashboardRecentInvoiceSchema = z.object({
  id: z.string().uuid(),
  number: z.string(),
  kind: z.enum(["SALE", "PURCHASE"]),
  partyName: z.string(),
  dateJalali: z.string(),
  total: z.string(),
});
export type DashboardRecentInvoice = z.infer<
  typeof DashboardRecentInvoiceSchema
>;

export const DashboardSummarySchema = z.object({
  asOfJalali: z.string(),
  fiscalYearTitle: z.string().nullable().optional(),
  accountsCount: z.number().int().nonnegative(),
  partiesCount: z.number().int().nonnegative(),
  productsCount: z.number().int().nonnegative(),
  vouchersCount: z.number().int().nonnegative(),
  invoicesCount: z.number().int().nonnegative(),
  activeInvoicesCount: z.number().int().nonnegative(),
  totalDebit: z.string(),
  totalCredit: z.string(),
  isBalanced: z.boolean(),
  recentVouchers: z.array(DashboardRecentVoucherSchema),
  recentInvoices: z.array(DashboardRecentInvoiceSchema),
  charts: z
    .object({
      monthlyTrend: z.array(
        z.object({
          monthLabel: z.string(),
          monthKey: z.string(),
          sales: z.string(),
          purchases: z.string(),
          receipts: z.string(),
          payments: z.string(),
        }),
      ),
      accountTypeMix: z.array(
        z.object({
          type: z.enum(["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"]),
          label: z.string(),
          amount: z.string(),
        }),
      ),
      arAp: z.object({
        receivable: z.string(),
        payable: z.string(),
      }),
    })
    .optional(),
  management: z
    .object({
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
    })
    .optional(),
});
export type DashboardSummary = z.infer<typeof DashboardSummarySchema>;
