import { describe, expect, it } from "vitest";
import { IRANIAN_COA_SEED } from "./iranian-coa";

describe("IRANIAN_COA_SEED", () => {
  it("contains at least 30 accounts", () => {
    expect(IRANIAN_COA_SEED.length).toBeGreaterThanOrEqual(30);
  });

  it("has unique codes", () => {
    const codes = IRANIAN_COA_SEED.map((a) => a.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("references existing parents", () => {
    const codes = new Set(IRANIAN_COA_SEED.map((a) => a.code));
    for (const account of IRANIAN_COA_SEED) {
      if (account.parentCode !== null) {
        expect(codes.has(account.parentCode)).toBe(true);
      }
    }
  });
});
