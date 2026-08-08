import { describe, expect, it } from "vitest";
import { DashboardSummarySchema } from "./dashboard.schema";

describe("DashboardSummarySchema", () => {
  it("accepts a balanced summary payload", () => {
    const parsed = DashboardSummarySchema.parse({
      asOfJalali: "1403/05/15",
      accountsCount: 39,
      partiesCount: 2,
      productsCount: 1,
      vouchersCount: 3,
      invoicesCount: 2,
      activeInvoicesCount: 1,
      totalDebit: "1000",
      totalCredit: "1000",
      isBalanced: true,
      recentVouchers: [],
      recentInvoices: [],
    });
    expect(parsed.isBalanced).toBe(true);
    expect(parsed.accountsCount).toBe(39);
  });
});
