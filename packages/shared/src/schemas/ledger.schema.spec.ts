import { describe, expect, it } from "vitest";
import { movementDelta, withRunningBalance } from "./ledger.schema";

describe("movementDelta", () => {
  it("increases debit-nature on debit", () => {
    expect(movementDelta("DEBIT", 100n, 0n)).toBe(100n);
    expect(movementDelta("DEBIT", 0n, 40n)).toBe(-40n);
  });

  it("increases credit-nature on credit", () => {
    expect(movementDelta("CREDIT", 0n, 100n)).toBe(100n);
    expect(movementDelta("CREDIT", 40n, 0n)).toBe(-40n);
  });
});

describe("withRunningBalance", () => {
  it("matches manual running total", () => {
    const rows = withRunningBalance("DEBIT", 1000n, [
      { debit: 200n, credit: 0n },
      { debit: 0n, credit: 50n },
      { debit: 100n, credit: 0n },
    ]);
    expect(rows.map((r) => r.balance)).toEqual([1200n, 1150n, 1250n]);
  });
});
