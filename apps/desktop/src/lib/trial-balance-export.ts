import * as XLSX from "xlsx";
import type { TrialBalanceReport, TrialBalanceTreeNode } from "@hesabyar/shared";
import { formatMoneyFa } from "./money";

const LEVEL_LABELS: Record<string, string> = {
  GROUP: "گروه",
  TOTAL: "کل",
  SUBTOTAL: "معین",
  DETAIL: "تفصیلی",
};

function flattenTree(
  nodes: TrialBalanceTreeNode[],
  depth = 0,
): Array<{
  code: string;
  name: string;
  level: string;
  debit: string;
  credit: string;
}> {
  const rows: Array<{
    code: string;
    name: string;
    level: string;
    debit: string;
    credit: string;
  }> = [];

  for (const node of nodes) {
    const indent = depth > 0 ? `${"  ".repeat(depth)}` : "";
    rows.push({
      code: node.data.code,
      name: `${indent}${node.data.name}`,
      level: LEVEL_LABELS[node.data.level] ?? node.data.level,
      debit: formatMoneyFa(node.data.debit),
      credit: formatMoneyFa(node.data.credit),
    });
    if (node.children?.length) {
      rows.push(...flattenTree(node.children, depth + 1));
    }
  }

  return rows;
}

export function exportTrialBalanceExcel(report: TrialBalanceReport): void {
  const rows = flattenTree(report.tree);

  rows.push({
    code: "",
    name: "جمع کل (تفصیلی)",
    level: "",
    debit: formatMoneyFa(report.totalDebit),
    credit: formatMoneyFa(report.totalCredit),
  });

  const sheet = XLSX.utils.json_to_sheet(
    rows.map((r) => ({
      کد: r.code,
      "نام حساب": r.name,
      سطح: r.level,
      بدهکار: r.debit,
      بستانکار: r.credit,
    })),
  );

  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "تراز آزمایشی");
  XLSX.writeFile(book, `trial-balance-${report.asOfJalali.replace(/\//g, "-")}.xlsx`);
}

export { flattenTree };
