import { describe, expect, it } from "vitest";
import {
  CreateReceiptSchema,
  CreatePaymentSchema,
  isValidJalaliDateString,
  compareJalali,
} from "../index";

describe("payment schemas", () => {
  it("accepts valid receipt", () => {
    const parsed = CreateReceiptSchema.parse({
      dateJalali: "1403/05/01",
      partyId: "00000000-0000-4000-8000-000000000001",
      amount: "1000000",
      cashAccountId: "00000000-0000-4000-8000-000000000002",
    });
    expect(parsed.amount).toBe(1000000n);
  });

  it("rejects zero payment amount", () => {
    expect(() =>
      CreatePaymentSchema.parse({
        dateJalali: "1403/05/01",
        partyId: "00000000-0000-4000-8000-000000000001",
        amount: "0",
        cashAccountId: "00000000-0000-4000-8000-000000000002",
      }),
    ).toThrow();
  });
});

describe("jalali helpers", () => {
  it("validates jalali date string", () => {
    expect(isValidJalaliDateString("1403/01/01")).toBe(true);
    expect(isValidJalaliDateString("1403/13/01")).toBe(false);
  });

  it("compares jalali dates", () => {
    expect(compareJalali("1403/02/01", "1403/01/01")).toBeGreaterThan(0);
  });
});
