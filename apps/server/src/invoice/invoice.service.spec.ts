import { BadRequestException } from "@nestjs/common";
import { InvoiceService } from "./invoice.service";
import type { PrismaService } from "../prisma/prisma.service";
import type { FiscalYearService } from "../fiscal-year/fiscal-year.service";

const partyCustomer = {
  id: "550e8400-e29b-41d4-a716-446655440001",
  kind: "CUSTOMER" as const,
  name: "مشتری تست",
  isActive: true,
};

const product = {
  id: "550e8400-e29b-41d4-a716-446655440002",
  sku: "P1",
  name: "کالا",
  isActive: true,
  unitPrice: 100_000n,
  costPrice: 60_000n,
  stockQty: 100,
  vatRate: 0.09,
};

const accounts = [
  {
    id: "550e8400-e29b-41d4-a716-446655440011",
    code: "11201",
    name: "دریافتنی",
    isActive: true,
    level: "DETAIL",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440012",
    code: "21101",
    name: "پرداختنی",
    isActive: true,
    level: "DETAIL",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440013",
    code: "41101",
    name: "فروش",
    isActive: true,
    level: "DETAIL",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440014",
    code: "11301",
    name: "موجودی",
    isActive: true,
    level: "DETAIL",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440015",
    code: "21201",
    name: "مالیات",
    isActive: true,
    level: "DETAIL",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440016",
    code: "51201",
    name: "COGS",
    isActive: true,
    level: "DETAIL",
  },
];

const fiscal = {
  assertWritable: jest.fn().mockResolvedValue(undefined),
} as unknown as FiscalYearService;

function makeService(prisma: PrismaService): InvoiceService {
  return new InvoiceService(prisma, fiscal);
}

describe("InvoiceService", () => {
  it("rejects SALE for supplier party", async () => {
    const prisma = {
      party: {
        findUnique: jest.fn().mockResolvedValue({
          ...partyCustomer,
          kind: "SUPPLIER",
        }),
      },
    } as unknown as PrismaService;

    const service = makeService(prisma);
    await expect(
      service.preview({
        kind: "SALE",
        partyId: partyCustomer.id,
        dateJalali: "1403/05/15",
        description: "",
        headerDiscount: 0n,
        lines: [
          {
            productId: product.id,
            quantity: 1,
            unitPrice: 100_000n,
            vatRate: 0.09,
            discountAmount: 0n,
          },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("builds balanced SALE preview with COGS", async () => {
    const prisma = {
      party: { findUnique: jest.fn().mockResolvedValue(partyCustomer) },
      product: { findMany: jest.fn().mockResolvedValue([product]) },
      account: { findMany: jest.fn().mockResolvedValue(accounts) },
    } as unknown as PrismaService;

    const service = makeService(prisma);
    const preview = await service.preview({
      kind: "SALE",
      partyId: partyCustomer.id,
      dateJalali: "1403/05/15",
      description: "تست",
      lines: [
        {
          productId: product.id,
          quantity: 2,
          unitPrice: 100_000n,
          vatRate: 0.09,
          discountAmount: 10_000n,
        },
      ],
      headerDiscount: 5_000n,
    });

    expect(preview.subtotal).toBe("190000");
    expect(preview.cogsTotal).toBe("120000");
    expect(preview.totalDebit).toBe(preview.totalCredit);
    expect(preview.lines.length).toBeGreaterThanOrEqual(3);
  });

  it("builds balanced PURCHASE preview (vat in inventory)", async () => {
    const prisma = {
      party: {
        findUnique: jest.fn().mockResolvedValue({
          ...partyCustomer,
          kind: "SUPPLIER",
        }),
      },
      product: { findMany: jest.fn().mockResolvedValue([product]) },
      account: { findMany: jest.fn().mockResolvedValue(accounts) },
    } as unknown as PrismaService;

    const service = makeService(prisma);
    const preview = await service.preview({
      kind: "PURCHASE",
      partyId: partyCustomer.id,
      dateJalali: "1403/05/15",
      description: "",
      headerDiscount: 0n,
      lines: [
        {
          productId: product.id,
          quantity: 1,
          unitPrice: 100_000n,
          vatRate: 0.09,
          discountAmount: 0n,
        },
      ],
    });

    expect(preview.total).toBe("109000");
    expect(preview.lines).toHaveLength(2);
    expect(preview.totalDebit).toBe(preview.totalCredit);
  });

  it("rejects SALE when stock insufficient", async () => {
    const prisma = {
      party: { findUnique: jest.fn().mockResolvedValue(partyCustomer) },
      product: {
        findMany: jest.fn().mockResolvedValue([
          { ...product, stockQty: 1 },
        ]),
      },
      account: { findMany: jest.fn().mockResolvedValue(accounts) },
    } as unknown as PrismaService;

    const service = makeService(prisma);
    await expect(
      service.preview({
        kind: "SALE",
        partyId: partyCustomer.id,
        dateJalali: "1403/05/15",
        description: "",
        headerDiscount: 0n,
        lines: [
          {
            productId: product.id,
            quantity: 5,
            unitPrice: 100_000n,
            vatRate: 0.09,
            discountAmount: 0n,
          },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
