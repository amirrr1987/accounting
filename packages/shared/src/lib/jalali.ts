/**
 * تبدیل تاریخ شمسی ↔ میلادی برای اسناد حسابداری
 */
import {
  isValidJalaaliDate,
  toGregorian,
  toJalaali,
} from "jalaali-js";

export function isValidJalaliDateString(jalaliDate: string): boolean {
  const [jy, jm, jd] = jalaliDate.split("/").map(Number);
  if (!jy || !jm || !jd) return false;
  return isValidJalaaliDate(jy, jm, jd);
}

export function jalaliToGregorianDate(jalaliDate: string): Date {
  const [jy, jm, jd] = jalaliDate.split("/").map(Number);
  if (!jy || !jm || !jd) {
    throw new Error("تاریخ شمسی نامعتبر است");
  }
  if (!isValidJalaaliDate(jy, jm, jd)) {
    throw new Error("تاریخ شمسی نامعتبر است");
  }
  const { gy, gm, gd } = toGregorian(jy, jm, jd);
  return new Date(Date.UTC(gy, gm - 1, gd));
}

export function gregorianToJalali(date: Date): string {
  const { jy, jm, jd } = toJalaali(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
  );
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${jy}/${pad(jm)}/${pad(jd)}`;
}

export function todayJalali(): string {
  const now = new Date();
  const { jy, jm, jd } = toJalaali(
    now.getFullYear(),
    now.getMonth() + 1,
    now.getDate(),
  );
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${jy}/${pad(jm)}/${pad(jd)}`;
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
