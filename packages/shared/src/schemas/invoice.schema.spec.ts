import { describe, expect, it } from "vitest";
import {
  calcInvoiceLine,
  calcInvoiceTotals,
  CreateInvoiceSchema,
  formatInvoiceNumber,
} from "./invoice.schema";

describe("calcInvoiceLine", () => {
  it("computes net + 9% vat", () => {
    const r = calcInvoiceLine({
      quantity: 2,
      unitPrice: 100_000n,
      vatRate: 0.09,
    });
    expect(r.lineNet).toBe(200_000n);
    expect(r.lineVat).toBe(18_000n);
    expect(r.lineTotal).toBe(218_000n);
  });

  it("applies line discount before vat", () => {
    const r = calcInvoiceLine({
      quantity: 2,
      unitPrice: 100_000n,
      vatRate: 0.09,
      discountAmount: 20_000n,
    });
    expect(r.lineNet).toBe(180_000n);
    expect(r.lineVat).toBe(16_200n);
  });
});

describe("calcInvoiceTotals", () => {
  it("sums lines", () => {
    const t = calcInvoiceTotals([
      { quantity: 1, unitPrice: 1000n, vatRate: 0.1 },
      { quantity: 1, unitPrice: 2000n, vatRate: 0 },
    ]);
    expect(t.subtotal).toBe(3000n);
    expect(t.vatAmount).toBe(100n);
    expect(t.total).toBe(3100n);
  });

  it("applies header discount", () => {
    const t = calcInvoiceTotals(
      [{ quantity: 1, unitPrice: 100_000n, vatRate: 0.09 }],
      10_000n,
    );
    expect(t.headerDiscount).toBe(10_000n);
    expect(t.total).toBe(99_000n);
  });
});

describe("CreateInvoiceSchema", () => {
  it("requires at least one line", () => {
    expect(() =>
      CreateInvoiceSchema.parse({
        kind: "SALE",
        partyId: "550e8400-e29b-41d4-a716-446655440001",
        dateJalali: "1403/05/15",
        lines: [],
      }),
    ).toThrow();
  });
});

describe("formatInvoiceNumber", () => {
  it("uses Persian digits", () => {
    expect(formatInvoiceNumber(1)).toBe("فاکتور-۰۰۰۱");
  });
});
