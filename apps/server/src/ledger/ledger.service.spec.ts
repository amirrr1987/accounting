import { withRunningBalance } from "@hesabyar/shared";

describe("ledger running balance integration shape", () => {
  it("computes closing from opening + movements", () => {
    const rows = withRunningBalance("CREDIT", 500n, [
      { debit: 0n, credit: 200n },
      { debit: 50n, credit: 0n },
    ]);
    expect(rows[1].balance).toBe(650n);
  });
});
