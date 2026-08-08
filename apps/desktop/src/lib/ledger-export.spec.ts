import { describe, expect, it } from "vitest";
import { withRunningBalance } from "@hesabyar/shared";

describe("ledger export prerequisites", () => {
  it("running balance stays consistent for excel/pdf totals", () => {
    const rows = withRunningBalance("DEBIT", 0n, [
      { debit: 100n, credit: 0n },
      { debit: 0n, credit: 30n },
    ]);
    expect(rows[1].balance).toBe(70n);
  });
});
