import { DashboardService } from "./dashboard.service";
import type { PrismaService } from "../prisma/prisma.service";
import type { FiscalYearService } from "../fiscal-year/fiscal-year.service";
import type { ReportService } from "../report/report.service";

describe("DashboardService.getSummary", () => {
  it("aggregates counts and balance flag", async () => {
    const prisma = {
      account: {
        count: jest.fn().mockResolvedValue(10),
        findMany: jest.fn().mockResolvedValue([
          { id: "a1", nature: "DEBIT", level: "DETAIL" },
          { id: "a2", nature: "CREDIT", level: "DETAIL" },
        ]),
      },
      party: { count: jest.fn().mockResolvedValue(2) },
      product: { count: jest.fn().mockResolvedValue(3) },
      voucher: {
        count: jest.fn().mockResolvedValue(4),
        findMany: jest.fn().mockResolvedValue([
          {
            id: "550e8400-e29b-41d4-a716-446655440001",
            number: "سند-۰۰۰۱",
            date: new Date(Date.UTC(2024, 7, 5)),
            description: "تست",
            lines: [{ debit: 100n, credit: 0n }],
          },
        ]),
      },
      invoice: {
        count: jest
          .fn()
          .mockResolvedValueOnce(5)
          .mockResolvedValueOnce(4),
        findMany: jest.fn().mockResolvedValue([]),
      },
      voucherLine: {
        groupBy: jest.fn().mockResolvedValue([
          { accountId: "a1", _sum: { debit: 100n, credit: 0n } },
          { accountId: "a2", _sum: { debit: 0n, credit: 100n } },
        ]),
      },
    } as unknown as PrismaService;

    const fiscalYearService = {
      ensureDefaultYear: jest.fn().mockResolvedValue({
        id: "fy1",
        title: "1403",
        startJalali: "1403/01/01",
        endJalali: "1403/12/29",
        isClosed: false,
        isActive: true,
      }),
    } as unknown as FiscalYearService;

    const reportService = {
      charts: jest.fn().mockResolvedValue({
        monthlyTrend: [],
        accountTypeMix: [],
        arAp: { receivable: "0", payable: "0" },
      }),
      managementKpis: jest.fn().mockResolvedValue({
        totalCash: "1000000",
        totalBank: "2000000",
        totalInventory: "3000000",
        totalChecks: "500000",
        grandTotal: "6500000",
        checksDueThisWeek: 2,
        checksOverdue: 1,
        lowStockCount: 0,
        lowStockProducts: [],
        periodSaleLoss: "0",
        periodOwnerDrawings: "0",
      }),
    } as unknown as ReportService;

    const partnerService = {
      ownership: jest.fn().mockResolvedValue(null),
    } as unknown as import("../partner/partner.service").PartnerService;

    const service = new DashboardService(
      prisma,
      fiscalYearService,
      reportService,
      partnerService,
    );
    const summary = await service.getSummary();

    expect(summary.accountsCount).toBe(10);
    expect(summary.partiesCount).toBe(2);
    expect(summary.isBalanced).toBe(true);
    expect(summary.totalDebit).toBe("100");
    expect(summary.recentVouchers).toHaveLength(1);
    expect(summary.management?.grandTotal).toBe("6500000");
  });
});
