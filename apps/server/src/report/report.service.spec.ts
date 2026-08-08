import { ReportService } from "./report.service";
import type { PrismaService } from "../prisma/prisma.service";

describe("ReportService", () => {
  it("aggregates VAT from sale and purchase invoices", async () => {
    const prisma = {
      invoice: {
        findMany: jest.fn().mockResolvedValue([
          {
            kind: "SALE",
            number: "فاکتور-0001",
            date: new Date("2024-08-06T00:00:00.000Z"),
            subtotal: 1_000_000n,
            vatAmount: 90_000n,
            total: 1_090_000n,
            party: { name: "مشتری الف" },
          },
          {
            kind: "PURCHASE",
            number: "فاکتور-0002",
            date: new Date("2024-08-10T00:00:00.000Z"),
            subtotal: 500_000n,
            vatAmount: 45_000n,
            total: 545_000n,
            party: { name: "تأمین‌کننده ب" },
          },
        ]),
      },
    } as unknown as PrismaService;

    const service = new ReportService(prisma);
    const report = await service.vatReport({
      fromJalali: "1403/01/01",
      toJalali: "1403/12/29",
    });

    expect(report.outputVat).toBe("90000");
    expect(report.inputVat).toBe("45000");
    expect(report.netPayable).toBe("45000");
    expect(report.sales).toHaveLength(1);
    expect(report.purchases).toHaveLength(1);
    expect(report.sales[0]?.partyName).toBe("مشتری الف");
  });
});
