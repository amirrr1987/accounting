import { describe, expect, it } from "vitest";
import { DashboardSummarySchema } from "@hesabyar/shared";

describe("dashboard client contract", () => {
  it("matches shared DashboardSummarySchema", () => {
    const parsed = DashboardSummarySchema.parse({
      asOfJalali: "1403/05/15",
      accountsCount: 1,
      partiesCount: 0,
      productsCount: 0,
      vouchersCount: 0,
      invoicesCount: 0,
      activeInvoicesCount: 0,
      totalDebit: "0",
      totalCredit: "0",
      isBalanced: true,
      recentVouchers: [],
      recentInvoices: [],
    });
    expect(parsed.isBalanced).toBe(true);
  });
});
