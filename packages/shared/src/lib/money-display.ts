import { z } from "zod";

/** واحد نمایش/ورود — مبالغ در DB همیشه به ریال ذخیره می‌شوند */
export const DisplayUnitSchema = z.enum([
  "RIAL",
  "TOMAN",
  "THOUSAND_RIAL",
  "THOUSAND_TOMAN",
]);
export type DisplayUnit = z.infer<typeof DisplayUnitSchema>;

export const DISPLAY_UNIT_LABELS: Record<DisplayUnit, string> = {
  RIAL: "ریال",
  TOMAN: "تومان",
  THOUSAND_RIAL: "هزار ریال",
  THOUSAND_TOMAN: "هزار تومان",
};

export const DISPLAY_UNIT_SHORT_LABELS: Record<DisplayUnit, string> = {
  RIAL: "ریال",
  TOMAN: "ت.",
  THOUSAND_RIAL: "هزار ر.",
  THOUSAND_TOMAN: "هزار ت.",
};

/** ضریب تبدیل واحد نمایش به ریال */
export function displayUnitDivisor(unit: DisplayUnit): number {
  switch (unit) {
    case "RIAL":
      return 1;
    case "TOMAN":
      return 10;
    case "THOUSAND_RIAL":
      return 1_000;
    case "THOUSAND_TOMAN":
      return 10_000;
  }
}

function toBigIntRial(value: string | number | bigint): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return 0n;
    return BigInt(Math.trunc(value));
  }
  const trimmed = value.trim();
  if (trimmed === "" || trimmed === "-") return 0n;
  try {
    return BigInt(trimmed);
  } catch {
    return 0n;
  }
}

/** نمایش مبلغ ریالی با واحد انتخاب‌شده */
export function formatMoneyRial(
  amountRial: string | number | bigint,
  displayUnit: DisplayUnit,
): string {
  const rial = toBigIntRial(amountRial);
  const divisor = BigInt(displayUnitDivisor(displayUnit));
  if (divisor === 1n) {
    return new Intl.NumberFormat("fa-IR", {
      maximumFractionDigits: 0,
    }).format(Number(rial));
  }

  const whole = rial / divisor;
  const remainder = rial % divisor;
  if (remainder === 0n) {
    return new Intl.NumberFormat("fa-IR", {
      maximumFractionDigits: 0,
    }).format(Number(whole));
  }

  const scaled = Number(rial) / Number(divisor);
  return new Intl.NumberFormat("fa-IR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(scaled);
}

/** برچسب کامل: «۱۲۳ تومان» */
export function formatMoneyWithUnit(
  amountRial: string | number | bigint,
  displayUnit: DisplayUnit,
): string {
  return `${formatMoneyRial(amountRial, displayUnit)} ${DISPLAY_UNIT_LABELS[displayUnit]}`;
}

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

/** ارقام فارسی/انگلیسی → رشته عدد صحیح */
export function normalizeMoneyDigits(raw: string): string {
  const normalized = raw
    .replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d)))
    .replace(/[^\d]/g, "");
  if (normalized === "") return "0";
  return normalized.replace(/^0+(?=\d)/, "");
}

/** تبدیل مقدار واردشده در واحد نمایش به ریال (رشته) */
export function parseDisplayInputToRial(
  raw: string,
  inputUnit: DisplayUnit,
): string {
  const digits = normalizeMoneyDigits(raw);
  const displayAmount = BigInt(digits === "" ? "0" : digits);
  const rial = displayAmount * BigInt(displayUnitDivisor(inputUnit));
  return rial.toString();
}
