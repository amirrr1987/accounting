import type { Voucher } from "@hesabyar/shared";
import { formatMoneyFa } from "@/lib/money";

export function printVoucher(
  voucher: Voucher,
  accountNames: Map<string, string>,
): void {
  const rows = voucher.lines
    .map(
      (l) => `
    <tr>
      <td>${accountNames.get(l.accountId) ?? l.accountId}</td>
      <td>${l.description}</td>
      <td>${formatMoneyFa(l.debit)}</td>
      <td>${formatMoneyFa(l.credit)}</td>
    </tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html><html dir="rtl" lang="fa"><head>
    <meta charset="utf-8"/>
    <title>${voucher.number}</title>
    <style>
      body { font-family: Vazirmatn, Tahoma, sans-serif; padding: 24px; }
      h1 { font-size: 1.25rem; margin-bottom: 4px; }
      table { width: 100%; border-collapse: collapse; margin-top: 16px; }
      th, td { border: 1px solid #ccc; padding: 8px; text-align: right; }
      th { background: #f1f5f9; }
    </style>
  </head><body>
    <h1>${voucher.number}</h1>
    <p>تاریخ: ${voucher.dateJalali} · ${voucher.description}</p>
    <table>
      <thead><tr><th>حساب</th><th>شرح</th><th>بدهکار</th><th>بستانکار</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p><strong>جمع بدهکار:</strong> ${formatMoneyFa(voucher.totalDebit)}</p>
    <p><strong>جمع بستانکار:</strong> ${formatMoneyFa(voucher.totalCredit)}</p>
  </body></html>`;

  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.print();
}
