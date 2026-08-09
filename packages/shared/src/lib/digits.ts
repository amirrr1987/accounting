const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_INDIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** ارقام فارسی و عربی‌هندی → ASCII (۰۱۲ → 012، ٠١٢ → 012) */
export function toAsciiDigits(value: string): string {
  if (!value) return value;
  return value
    .replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(ARABIC_INDIC_DIGITS.indexOf(d)));
}

/** آیا رشته شامل رقم فارسی یا عربی‌هندی است؟ */
export function hasNonAsciiDigits(value: string): boolean {
  return /[۰-۹٠-٩]/.test(value);
}
