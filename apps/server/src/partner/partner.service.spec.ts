import { BadRequestException } from "@nestjs/common";
import { PartnerService } from "./partner.service";
import type { PrismaService } from "../prisma/prisma.service";
import type { FiscalYearService } from "../fiscal-year/fiscal-year.service";
import type { ReportService } from "../report/report.service";

const fiscal = {
  assertWritable: jest.fn().mockResolvedValue(undefined),
} as unknown as FiscalYearService;

const reportService = {
  profitLoss: jest.fn().mockResolvedValue({
    netProfit: "1000000",
    incomeTotal: "5000000",
    expenseTotal: "4000000",
  }),
} as unknown as ReportService;

describe("PartnerService", () => {
  it("rejects share total over 100%", async () => {
    const prisma = {
      businessPartner: {
        findMany: jest.fn().mockResolvedValue([
          { id: "550e8400-e29b-41d4-a716-446655440001", sharePercent: 60 },
        ]),
      },
    } as unknown as PrismaService;

    const service = new PartnerService(prisma, fiscal, reportService);
    await expect(
      service.create({
        name: "شریک دوم",
        sharePercent: 50,
        isActive: true,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("splits equity 60/40 between two partners", async () => {
    const partners = [
      {
        id: "550e8400-e29b-41d4-a716-446655440001",
        name: "علی",
        sharePercent: 60,
        coaCapitalAccountId: "550e8400-e29b-41d4-a716-446655440011",
        coaDrawingAccountId: "550e8400-e29b-41d4-a716-446655440012",
        isActive: true,
        coaCapitalAccount: { code: "32201" },
        coaDrawingAccount: { code: "33201" },
      },
      {
        id: "550e8400-e29b-41d4-a716-446655440002",
        name: "رضا",
        sharePercent: 40,
        coaCapitalAccountId: "550e8400-e29b-41d4-a716-446655440013",
        coaDrawingAccountId: "550e8400-e29b-41d4-a716-446655440014",
        isActive: true,
        coaCapitalAccount: { code: "32202" },
        coaDrawingAccount: { code: "33202" },
      },
    ];

    const prisma = {
      businessPartner: {
        findMany: jest.fn().mockResolvedValue(partners),
      },
      voucherLine: {
        groupBy: jest.fn().mockResolvedValue([]),
      },
      bankAccount: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      account: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    } as unknown as PrismaService;

    const service = new PartnerService(prisma, fiscal, reportService);

    jest.spyOn(service, "ownership").mockResolvedValue({
      totalAssets: "10000000",
      totalLiabilities: "2000000",
      netEquity: "8000000",
      sharePercentTotal: 100,
      isShareValid: true,
      slices: [],
    });

    const report = await service.balances("1403/01/01", "1403/12/29");

    expect(report.rows).toHaveLength(2);
    expect(report.rows[0]?.equityShare).toBe("4800000");
    expect(report.rows[1]?.equityShare).toBe("3200000");
    expect(report.isShareValid).toBe(true);
  });
});
