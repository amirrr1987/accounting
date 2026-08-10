/**
 * تبدیل تاریخ شمسی ↔ میلادی برای اسناد حسابداری.
 *
 * قرارداد:
 * - تاریخ کسب‌وکار (سند/فاکتور/چک/…): رشته جلالی در API/UI، DATE میلادی UTC در DB
 * - زمان سیستمی (createdAt/audit): timestamp — اینجا تبدیل نمی‌شود
 */
import {
  isValidJalaaliDate,
  toGregorian,
  toJalaali,
} from "jalaali-js";

const JALALI_DATE_RE = /^\d{4}\/\d{2}\/\d{2}$/;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function parseJalaliParts(
  jalaliDate: string,
): { jy: number; jm: number; jd: number } | null {
  if (!JALALI_DATE_RE.test(jalaliDate)) return null;
  const [jy, jm, jd] = jalaliDate.split("/").map(Number);
  if (!Number.isFinite(jy) || !Number.isFinite(jm) || !Number.isFinite(jd)) {
    return null;
  }
  if (!isValidJalaaliDate(jy, jm, jd)) return null;
  return { jy, jm, jd };
}

export function isValidJalaliDateString(jalaliDate: string): boolean {
  return parseJalaliParts(jalaliDate) !== null;
}

/** تاریخ کسب‌وکار جلالی → Date در نیمه‌شب UTC (مناسب Prisma @db.Date) */
export function jalaliToGregorianDate(jalaliDate: string): Date {
  const parts = parseJalaliParts(jalaliDate);
  if (!parts) {
    throw new Error("تاریخ شمسی نامعتبر است");
  }
  const { gy, gm, gd } = toGregorian(parts.jy, parts.jm, parts.jd);
  return new Date(Date.UTC(gy, gm - 1, gd));
}

/** Date ذخیره‌شده به‌صورت UTC DATE → رشته جلالی */
export function gregorianToJalali(date: Date): string {
  const { jy, jm, jd } = toJalaali(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
  );
  return `${jy}/${pad(jm)}/${pad(jd)}`;
}

/** «امروز» تقویمی محلی کاربر (برای فرم‌ها و سال مالی جاری) */
export function todayJalali(): string {
  const now = new Date();
  const { jy, jm, jd } = toJalaali(
    now.getFullYear(),
    now.getMonth() + 1,
    now.getDate(),
  );
  return `${jy}/${pad(jm)}/${pad(jd)}`;
}

/** امروز محلی → DATE میلادی UTC midnight (برای مقایسه با ستون‌های @db.Date) */
export function todayUtcDate(): Date {
  return jalaliToGregorianDate(todayJalali());
}

/** جمع/تفریق روز روی DATE میلادی UTC — بدون وابستگی به timezone محلی */
export function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

/** آخرین روز سال شمسی (۱۲/۳۰ در کبیسه، وگرنه ۱۲/۲۹) */
export function endOfJalaliYear(year: string | number): string {
  const y = String(year);
  const leapEnd = `${y}/12/30`;
  if (isValidJalaliDateString(leapEnd)) return leapEnd;
  return `${y}/12/29`;
}

/** سال شمسی جاری از امروز محلی */
export function currentJalaliYear(): string {
  return todayJalali().split("/")[0] ?? "1400";
}

/** مقایسه دو تاریخ شمسی — منفی اگر a < b */
export function compareJalali(a: string, b: string): number {
  const toKey = (d: string) => d.replace(/\//g, "");
  return Number(toKey(a)) - Number(toKey(b));
}

export function isJalaliInRange(
  date: string,
  from: string,
  to: string,
): boolean {
  return compareJalali(date, from) >= 0 && compareJalali(date, to) <= 0;
}

/** کلید ماه شمسی: 1403/05 */
export function jalaliMonthKey(date: string): string {
  const [y, m] = date.split("/");
  return `${y}/${m}`;
}

export function jalaliMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("/");
  const names = [
    "",
    "فروردین",
    "اردیبهشت",
    "خرداد",
    "تیر",
    "مرداد",
    "شهریور",
    "مهر",
    "آبان",
    "آذر",
    "دی",
    "بهمن",
    "اسفند",
  ];
  const mi = Number(m);
  return `${names[mi] ?? m} ${y}`;
}
