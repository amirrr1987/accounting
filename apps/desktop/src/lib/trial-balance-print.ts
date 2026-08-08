import type { TrialBalanceReport } from "@hesabyar/shared";
import { formatMoneyFa } from "./money";

export function printTrialBalance(report: TrialBalanceReport): void {
  const flatten = (
    nodes: TrialBalanceReport["tree"],
    depth = 0,
  ): string =>
    nodes
      .map((n) => {
        const pad = "&nbsp;".repeat(depth * 4);
        const row = `
        <tr class="${report.isBalanced ? "" : "broken"}">
          <td>${pad}${n.data.code}</td>
          <td>${n.data.name}</td>
          <td>${n.data.level}</td>
          <td>${formatMoneyFa(n.data.debit)}</td>
          <td>${formatMoneyFa(n.data.credit)}</td>
        </tr>`;
        const kids = n.children ? flatten(n.children, depth + 1) : "";
        return row + kids;
      })
      .join("");

  const html = `<!doctype html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>تراز آزمایشی</title>
  <style>
    body { font-family: Tahoma, Vazirmatn, sans-serif; direction: rtl; padding: 28px; color: #111; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #166534; padding-bottom: 12px; }
    .logo { width: 64px; height: 64px; border-radius: 12px; background: #166534; color: white; display:flex; align-items:center; justify-content:center; font-weight:bold; }
    h1 { margin: 0; font-size: 20px; }
    .meta { color: #444; font-size: 13px; margin: 4px 0 16px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: right; }
    th { background: #f3f4f6; }
    .totals { margin-top: 12px; font-size: 13px; font-weight: bold; }
    .broken-banner { background: #fee2e2; color: #991b1b; padding: 8px 12px; margin-bottom: 12px; border-radius: 6px; }
    .signs { display: flex; gap: 40px; margin-top: 48px; justify-content: space-between; }
    .sign { flex: 1; text-align: center; border-top: 1px solid #999; padding-top: 8px; font-size: 12px; }
    @media print { button { display: none; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>تراز آزمایشی — حساب‌یار</h1>
      <div class="meta">تاریخ مقطع: ${report.asOfJalali} | تولید: ${new Date(report.generatedAt).toLocaleString("fa-IR")}</div>
    </div>
    <div class="logo">HY</div>
  </div>
  ${
    report.isBalanced
      ? ""
      : `<div class="broken-banner">هشدار: جمع بدهکار با جمع بستانکار برابر نیست (خطای تشخیصی)</div>`
  }
  <table>
    <thead>
      <tr>
        <th>کد</th>
        <th>نام حساب</th>
        <th>سطح</th>
        <th>بدهکار</th>
        <th>بستانکار</th>
      </tr>
    </thead>
    <tbody>${flatten(report.tree)}</tbody>
  </table>
  <div class="totals ${report.isBalanced ? "" : "broken-banner"}">
    جمع بدهکار: ${formatMoneyFa(report.totalDebit)} —
    جمع بستانکار: ${formatMoneyFa(report.totalCredit)}
  </div>
  <div class="signs">
    <div class="sign">تهیه‌کننده</div>
    <div class="sign">مسئول حسابداری</div>
    <div class="sign">مدیرعامل</div>
  </div>
  <script>window.onload = () => window.print();<\/script>
</body>
</html>`;

  const win = window.open("", "_blank", "noopener,noreferrer,width=950,height=750");
  if (!win) return;
  win.document.open();
  win.document.write(html);
  win.document.close();
}
