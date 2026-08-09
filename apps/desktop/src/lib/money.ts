import {
  formatMoneyRial,
  normalizeMoneyDigits,
} from "@hesabyar/shared";
import {
  formatMoneyForDisplay,
  getDisplayUnit,
  getInputUnit,
  parseMoneyInputForDisplay,
} from "@/composables/useMoneyDisplay";

/** نمایش مبلغ به فرمت فارسی با واحد نمایش تنظیم‌شده */
export function formatMoneyFa(value: string | number | bigint): string {
  return formatMoneyForDisplay(value);
}

/** نمایش صریح با واحد مشخص (بدون وابستگی به تنظیمات) */
export function formatMoneyFaUnit(
  value: string | number | bigint,
  unit: Parameters<typeof formatMoneyRial>[1],
): string {
  return formatMoneyRial(value, unit);
}

/** حذف جداکننده و تبدیل ارقام فارسی؛ خروجی ریال برای API */
export function parseMoneyInput(raw: string): string {
  return parseMoneyInputForDisplay(raw);
}

/** فقط نرمال‌سازی ارقام (بدون ضرب واحد) */
export { normalizeMoneyDigits as parseMoneyDigitsOnly };

/** @deprecated از parseMoneyInput استفاده کنید */
export function parseMoneyInputRialOnly(raw: string): string {
  return normalizeMoneyDigits(raw);
}

export { getDisplayUnit, getInputUnit };
