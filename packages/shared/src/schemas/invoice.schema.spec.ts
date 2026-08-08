import { describe, expect, it } from "vitest";
import { resolveInvoiceLineUnitPrice } from "./invoice.schema";

describe("resolveInvoiceLineUnitPrice", () => {
  it("uses catalog price for FIXED products", () => {
    const result = resolveInvoiceLineUnitPrice(
      { unitPrice: 100_000n, pricingMode: "FIXED" },
      120_000n,
    );
    expect(result.unitPrice).toBe(100_000n);
    expect(result.catalogUnitPrice).toBe(100_000n);
  });

  it("snapshots requested price for AT_INVOICE products", () => {
    const result = resolveInvoiceLineUnitPrice(
      { unitPrice: 100_000n, pricingMode: "AT_INVOICE" },
      120_000n,
    );
    expect(result.unitPrice).toBe(120_000n);
    expect(result.catalogUnitPrice).toBe(100_000n);
  });
});
