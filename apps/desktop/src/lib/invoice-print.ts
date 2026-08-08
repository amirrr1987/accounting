import type { Invoice } from "@hesabyar/shared";
import { formatMoneyFa } from "@/lib/money";

export function printInvoice(invoice: Invoice): void {
  const rows = invoice.lines
    .map(
      (l) => `
    <tr>
      <td>${l.productName}</td>
      <td>${l.quantity}</td>
      <td>${formatMoneyFa(l.unitPrice)}</td>
      <td>${formatMoneyFa(l.lineTotal)}</td>
    </tr>`,
    )
    .join("");

  const kind = invoice.kind === "SALE" ? "فاکتور فروش" : "فاکتور خرید";

  const html = `<!DOCTYPE html><html dir="rtl" lang="fa"><head>
    <meta charset="utf-8"/>
    <title>${invoice.number}</title>
    <style>
      body { font-family: Vazirmatn, Tahoma, sans-serif; padding: 24px; }
      h1 { font-size: 1.25rem; }
      table { width: 100%; border-collapse: collapse; margin-top: 16px; }
      th, td { border: 1px solid #ccc; padding: 8px; text-align: right; }
      th { background: #f1f5f9; }
    </style>
  </head><body>
    <h1>${kind} — ${invoice.number}</h1>
    <p>طرف‌حساب: ${invoice.partyName} · تاریخ: ${invoice.dateJalali}</p>
    <table>
      <thead><tr><th>کالا</th><th>تعداد</th><th>قیمت</th><th>جمع</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p>جمع خالص: ${formatMoneyFa(invoice.subtotal)}</p>
    <p>مالیات: ${formatMoneyFa(invoice.vatAmount)}</p>
    <p><strong>جمع کل: ${formatMoneyFa(invoice.total)}</strong></p>
  </body></html>`;

  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.print();
}
