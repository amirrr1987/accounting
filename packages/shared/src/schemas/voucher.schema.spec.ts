import { describe, expect, it } from "vitest";
import {
  CreateVoucherSchema,
  formatVoucherNumber,
  isBalanced,
  sumCredit,
  sumDebit,
  VoucherLineInputSchema,
} from "./voucher.schema";

const accountA = "550e8400-e29b-41d4-a716-446655440001";
const accountB = "550e8400-e29b-41d4-a716-446655440002";

describe("VoucherLineInputSchema", () => {
  it("rejects line with both debit and credit", () => {
    expect(() =>
      VoucherLineInputSchema.parse({
        accountId: accountA,
        debit: "100",
        credit: "50",
      }),
    ).toThrow();
  });

  it("accepts debit-only line", () => {
    const line = VoucherLineInputSchema.parse({
      accountId: accountA,
      debit: "1000",
      credit: "0",
    });
    expect(line.debit).toBe(1000n);
    expect(line.credit).toBe(0n);
  });
});

describe("CreateVoucherSchema balance", () => {
  it("rejects unbalanced voucher", () => {
    expect(() =>
      CreateVoucherSchema.parse({
        dateJalali: "1403/05/15",
        description: "تست",
        lines: [
          { accountId: accountA, debit: "100", credit: "0" },
          { accountId: accountB, debit: "0", credit: "50" },
        ],
      }),
    ).toThrow();
  });

  it("accepts balanced voucher", () => {
    const voucher = CreateVoucherSchema.parse({
      dateJalali: "1403/05/15",
      description: "دریافت نقد",
      lines: [
        { accountId: accountA, debit: "100000", credit: "0" },
        { accountId: accountB, debit: "0", credit: "100000" },
      ],
    });
    expect(isBalanced(voucher.lines)).toBe(true);
    expect(sumDebit(voucher.lines)).toBe(sumCredit(voucher.lines));
  });
});

describe("formatVoucherNumber", () => {
  it("formats Persian prefix with Persian digits", () => {
    expect(formatVoucherNumber(1)).toBe("سند-۰۰۰۱");
    expect(formatVoucherNumber(12)).toBe("سند-۰۰۱۲");
  });
});
