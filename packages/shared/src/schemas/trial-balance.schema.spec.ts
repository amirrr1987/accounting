import { describe, expect, it } from "vitest";
import {
  balanceToDebitCredit,
  buildTrialBalanceTree,
  sumDetailColumns,
} from "./trial-balance.schema";

describe("balanceToDebitCredit", () => {
  it("puts debit-nature positive net on debit side", () => {
    expect(balanceToDebitCredit("DEBIT", 500n)).toEqual({
      debit: 500n,
      credit: 0n,
    });
  });

  it("puts credit-nature positive net on credit side", () => {
    expect(balanceToDebitCredit("CREDIT", 500n)).toEqual({
      debit: 0n,
      credit: 500n,
    });
  });
});

describe("buildTrialBalanceTree", () => {
  it("rolls detail into subtotal/total/group", () => {
    const group = {
      id: "g",
      code: "1",
      name: "دارایی",
      level: "GROUP" as const,
      type: "ASSET" as const,
      nature: "DEBIT" as const,
      parentId: null,
      debit: 0n,
      credit: 0n,
    };
    const total = {
      id: "t",
      code: "11",
      name: "جاری",
      level: "TOTAL" as const,
      type: "ASSET" as const,
      nature: "DEBIT" as const,
      parentId: "g",
      debit: 0n,
      credit: 0n,
    };
    const sub = {
      id: "s",
      code: "111",
      name: "نقد",
      level: "SUBTOTAL" as const,
      type: "ASSET" as const,
      nature: "DEBIT" as const,
      parentId: "t",
      debit: 0n,
      credit: 0n,
    };
    const detail = {
      id: "d",
      code: "11101",
      name: "صندوق",
      level: "DETAIL" as const,
      type: "ASSET" as const,
      nature: "DEBIT" as const,
      parentId: "s",
      debit: 1000n,
      credit: 0n,
    };

    const tree = buildTrialBalanceTree([group, total, sub, detail]);
    expect(tree).toHaveLength(1);
    expect(tree[0].data.debit).toBe("1000");
    expect(tree[0].children![0].children![0].data.debit).toBe("1000");

    const sums = sumDetailColumns([group, total, sub, detail]);
    expect(sums.totalDebit).toBe(1000n);
    expect(sums.totalCredit).toBe(0n);
  });
});
