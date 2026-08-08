import { BadRequestException } from "@nestjs/common";
import { VoucherService } from "./voucher.service";
import type { PrismaService } from "../prisma/prisma.service";

describe("VoucherService.create", () => {
  const detailA = {
    id: "550e8400-e29b-41d4-a716-446655440001",
    code: "11101",
    isActive: true,
    level: "DETAIL" as const,
  };
  const detailB = {
    id: "550e8400-e29b-41d4-a716-446655440002",
    code: "31101",
    isActive: true,
    level: "DETAIL" as const,
  };

  it("rejects non-detail accounts", async () => {
    const prisma = {
      account: {
        findMany: jest.fn().mockResolvedValue([
          { ...detailA, level: "GROUP" },
          detailB,
        ]),
      },
      $transaction: jest.fn(),
    } as unknown as PrismaService;

    const fiscal = {
      assertWritable: jest.fn().mockResolvedValue(undefined),
    } as unknown as import("../fiscal-year/fiscal-year.service").FiscalYearService;

    const service = new VoucherService(prisma, fiscal);
    await expect(
      service.create({
        dateJalali: "1403/05/15",
        description: "تست",
        lines: [
          { accountId: detailA.id, debit: 100n, credit: 0n, description: "" },
          { accountId: detailB.id, debit: 0n, credit: 100n, description: "" },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("creates balanced voucher in a transaction", async () => {
    const createdRow = {
      id: "550e8400-e29b-41d4-a716-446655440099",
      number: "سند-۰۰۰۱",
      date: new Date(Date.UTC(2024, 7, 5)),
      description: "افزایش سرمایه",
      createdAt: new Date(),
      updatedAt: new Date(),
      lines: [
        {
          id: "550e8400-e29b-41d4-a716-446655440011",
          voucherId: "550e8400-e29b-41d4-a716-446655440099",
          accountId: detailA.id,
          description: "",
          debit: 1000n,
          credit: 0n,
          lineOrder: 0,
        },
        {
          id: "550e8400-e29b-41d4-a716-446655440012",
          voucherId: "550e8400-e29b-41d4-a716-446655440099",
          accountId: detailB.id,
          description: "",
          debit: 0n,
          credit: 1000n,
          lineOrder: 1,
        },
      ],
    };

    const prisma = {
      account: {
        findMany: jest.fn().mockResolvedValue([detailA, detailB]),
      },
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          voucherSequence: {
            upsert: jest.fn().mockResolvedValue({ id: 1, value: 1 }),
          },
          voucher: {
            create: jest.fn().mockResolvedValue(createdRow),
          },
        };
        return fn(tx);
      }),
    } as unknown as PrismaService;

    const fiscal = {
      assertWritable: jest.fn().mockResolvedValue(undefined),
    } as unknown as import("../fiscal-year/fiscal-year.service").FiscalYearService;

    const service = new VoucherService(prisma, fiscal);
    const result = await service.create({
      dateJalali: "1403/05/15",
      description: "افزایش سرمایه",
      lines: [
        { accountId: detailA.id, debit: 1000n, credit: 0n, description: "" },
        { accountId: detailB.id, debit: 0n, credit: 1000n, description: "" },
      ],
    });

    expect(result.number).toBe("سند-۰۰۰۱");
    expect(result.totalDebit).toBe("1000");
    expect(result.totalCredit).toBe("1000");
  });
});
