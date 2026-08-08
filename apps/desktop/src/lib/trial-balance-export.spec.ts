import { describe, expect, it } from "vitest";
import type { TrialBalanceReport } from "@hesabyar/shared";
import { flattenTree } from "./trial-balance-export";

describe("trial balance export", () => {
  it("flattens nested tree with indentation", () => {
    const report: TrialBalanceReport = {
      asOfJalali: "1403/12/29",
      asOfGregorian: "2025-03-19",
      generatedAt: new Date().toISOString(),
      totalDebit: "100",
      totalCredit: "100",
      isBalanced: true,
      tree: [
        {
          key: "g1",
          data: {
            id: "g1",
            code: "1",
            name: "دارایی",
            level: "GROUP",
            type: "ASSET",
            nature: "DEBIT",
            debit: "100",
            credit: "0",
          },
          children: [
            {
              key: "d1",
              data: {
                id: "d1",
                code: "101",
                name: "بانک",
                level: "TOTAL",
                type: "ASSET",
                nature: "DEBIT",
                debit: "100",
                credit: "0",
              },
            },
          ],
        },
      ],
    };

    const rows = flattenTree(report.tree);
    expect(rows).toHaveLength(2);
    expect(rows[1]?.name).toBe("  بانک");
  });
});
