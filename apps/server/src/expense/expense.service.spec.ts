import { BadRequestException } from "@nestjs/common";
import { ExpenseService } from "./expense.service";
import type { PrismaService } from "../prisma/prisma.service";
import type { FiscalYearService } from "../fiscal-year/fiscal-year.service";

const category = {
  id: "550e8400-e29b-41d4-a716-446655440001",
  code: "RENT",
  nameFa: "اجاره محل",
  coaAccountCode: "51102",
  isActive: true,
};

const cashAccount = {
  id: "550e8400-e29b-41d4-a716-446655440002",
  code: "11101",
  name: "صندوق",
  isActive: true,
  level: "DETAIL" as const,
};

const expenseAccount = {
  id: "550e8400-e29b-41d4-a716-446655440003",
  code: "51102",
  name: "اجاره",
  isActive: true,
  level: "DETAIL" as const,
};

const fiscal = {
  assertWritable: jest.fn().mockResolvedValue(undefined),
} as unknown as FiscalYearService;

function makeService(prisma: PrismaService): ExpenseService {
  return new ExpenseService(prisma, fiscal);
}

describe("ExpenseService", () => {
  it("rejects invalid category", async () => {
    const prisma = {
      expenseCategory: { findUnique: jest.fn().mockResolvedValue(null) },
    } as unknown as PrismaService;
    const service = makeService(prisma);
    await expect(
      service.create({
        categoryId: category.id,
        dateJalali: "1403/05/15",
        amount: 1_000_000n,
        description: "",
        payFrom: "CASH",
        cashAccountId: cashAccount.id,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("creates expense with balanced voucher lines", async () => {
    const expenseRow = {
      id: "550e8400-e29b-41d4-a716-446655440010",
      categoryId: category.id,
      date: new Date("2024-08-05"),
      amount: 2_000_000n,
      description: "اجاره مرداد",
      payFrom: "CASH" as const,
      partyId: null,
      voucherId: "550e8400-e29b-41d4-a716-446655440011",
      category,
      party: null,
      voucher: { number: "P-00001" },
    };

    const prisma = {
      expenseCategory: { findUnique: jest.fn().mockResolvedValue(category) },
      account: {
        findUnique: jest
          .fn()
          .mockImplementation(({ where }: { where: { code?: string; id?: string } }) => {
            if (where.code === "51102") return expenseAccount;
            if (where.id === cashAccount.id) return cashAccount;
            return null;
          }),
      },
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          voucherSequence: {
            upsert: jest.fn().mockResolvedValue({ value: 1 }),
          },
          voucher: {
            create: jest.fn().mockResolvedValue({ id: expenseRow.voucherId }),
          },
          expense: {
            create: jest.fn().mockResolvedValue(expenseRow),
          },
        };
        return fn(tx);
      }),
    } as unknown as PrismaService;

    const service = makeService(prisma);
    const result = await service.create({
      categoryId: category.id,
      dateJalali: "1403/05/15",
      amount: 2_000_000n,
      description: "اجاره مرداد",
      payFrom: "CASH",
      cashAccountId: cashAccount.id,
    });

    expect(result.amount).toBe("2000000");
    expect(result.categoryName).toBe("اجاره محل");
    expect(result.voucherNumber).toBe("P-00001");
  });
});
