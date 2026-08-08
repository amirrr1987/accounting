import {
  balanceToDebitCredit,
  buildTrialBalanceTree,
  sumDetailColumns,
} from "@hesabyar/shared";

describe("TrialBalance rollup", () => {
  it("keeps equation when debit and credit details offset", () => {
    const accounts = [
      {
        id: "g1",
        code: "1",
        name: "دارایی",
        level: "GROUP" as const,
        type: "ASSET" as const,
        nature: "DEBIT" as const,
        parentId: null,
        debit: 0n,
        credit: 0n,
      },
      {
        id: "g2",
        code: "3",
        name: "حقوق",
        level: "GROUP" as const,
        type: "EQUITY" as const,
        nature: "CREDIT" as const,
        parentId: null,
        debit: 0n,
        credit: 0n,
      },
      {
        id: "d1",
        code: "11101",
        name: "صندوق",
        level: "DETAIL" as const,
        type: "ASSET" as const,
        nature: "DEBIT" as const,
        parentId: "g1",
        ...balanceToDebitCredit("DEBIT", 1000n),
      },
      {
        id: "d2",
        code: "31101",
        name: "سرمایه",
        level: "DETAIL" as const,
        type: "EQUITY" as const,
        nature: "CREDIT" as const,
        parentId: "g2",
        ...balanceToDebitCredit("CREDIT", 1000n),
      },
    ];

    const sums = sumDetailColumns(accounts);
    expect(sums.totalDebit).toBe(sums.totalCredit);
    expect(buildTrialBalanceTree(accounts)).toHaveLength(2);
  });
});
