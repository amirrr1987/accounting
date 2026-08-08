/** نمایش مبلغ به فرمت فارسی */
export function formatMoneyFa(value: string | number | bigint): string {
  const n = typeof value === "bigint" ? Number(value) : Number(value);
  if (!Number.isFinite(n)) return "۰";
  return new Intl.NumberFormat("fa-IR").format(n);
}

/** حذف جداکننده و تبدیل ارقام فارسی به انگلیسی برای ارسال به API */
export function parseMoneyInput(raw: string): string {
  const persian = "۰۱۲۳۴۵۶۷۸۹";
  const normalized = raw
    .replace(/[۰-۹]/g, (d) => String(persian.indexOf(d)))
    .replace(/[^\d]/g, "");
  return normalized === "" ? "0" : normalized.replace(/^0+(?=\d)/, "");
}
