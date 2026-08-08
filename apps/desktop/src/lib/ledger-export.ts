import * as XLSX from "xlsx";
import type { LedgerReport } from "@hesabyar/shared";
import { formatMoneyFa } from "./money";

export function exportLedgerExcel(report: LedgerReport): void {
  const rows = [
    {
      تاریخ: "",
      "شماره سند": "",
      شرح: "مانده اول دوره",
      بدهکار: "",
      بستانکار: "",
      مانده: formatMoneyFa(report.openingBalance),
    },
    ...report.entries.map((e) => ({
      تاریخ: e.dateJalali,
      "شماره سند": e.voucherNumber,
      شرح: e.description,
      بدهکار: formatMoneyFa(e.debit),
      بستانکار: formatMoneyFa(e.credit),
      مانده: formatMoneyFa(e.balance),
    })),
  ];

  const sheet = XLSX.utils.json_to_sheet(rows);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "دفترکل");
  XLSX.writeFile(
    book,
    `ledger-${report.account.code}.xlsx`,
  );
}

/** چاپ/PDF با HTML راست‌چین */
export function exportLedgerPdf(report: LedgerReport): void {
  const title = `دفتر کل — ${report.account.code} ${report.account.name}`;
  const range = [
    report.fromJalali ? `از ${report.fromJalali}` : null,
    report.toJalali ? `تا ${report.toJalali}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  const bodyRows = report.entries
    .map(
      (e) => `
      <tr>
        <td>${e.dateJalali}</td>
        <td>${e.voucherNumber}</td>
        <td>${e.description}</td>
        <td>${formatMoneyFa(e.debit)}</td>
        <td>${formatMoneyFa(e.credit)}</td>
        <td>${formatMoneyFa(e.balance)}</td>
      </tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    body { font-family: Tahoma, Vazirmatn, sans-serif; direction: rtl; padding: 24px; color: #111; }
    h1 { font-size: 18px; margin-bottom: 4px; }
    .meta { color: #444; margin-bottom: 16px; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: right; }
    th { background: #f3f4f6; }
    .summary { margin-top: 16px; font-size: 13px; }
    @media print { button { display: none; } }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="meta">${range || "همه تاریخ‌ها"}</div>
  <table>
    <thead>
      <tr>
        <th>تاریخ</th>
        <th>شماره سند</th>
        <th>شرح</th>
        <th>بدهکار</th>
        <th>بستانکار</th>
        <th>مانده</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td colspan="5">مانده اول دوره</td>
        <td>${formatMoneyFa(report.openingBalance)}</td>
      </tr>
      ${bodyRows}
    </tbody>
  </table>
  <div class="summary">
    جمع بدهکار: ${formatMoneyFa(report.totalDebit)} —
    جمع بستانکار: ${formatMoneyFa(report.totalCredit)} —
    مانده پایان: ${formatMoneyFa(report.closingBalance)}
  </div>
  <script>window.onload = () => window.print();<\/script>
</body>
</html>`;

  const win = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
  if (!win) return;
  win.document.open();
  win.document.write(html);
  win.document.close();
}
