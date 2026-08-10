import { describe, expect, it } from "vitest";
import {
  addUtcDays,
  endOfJalaliYear,
  gregorianToJalali,
  isValidJalaliDateString,
  jalaliToGregorianDate,
  todayJalali,
  todayUtcDate,
} from "./jalali";

describe("jalali conversion", () => {
  it("round-trips a known date", () => {
    const g = jalaliToGregorianDate("1403/01/01");
    expect(gregorianToJalali(g)).toBe("1403/01/01");
  });

  it("maps 1405/05/19 to 2026-08-10 UTC", () => {
    const g = jalaliToGregorianDate("1405/05/19");
    expect(g.toISOString().slice(0, 10)).toBe("2026-08-10");
    expect(gregorianToJalali(g)).toBe("1405/05/19");
  });

  it("rejects invalid jalali", () => {
    expect(() => jalaliToGregorianDate("1403/13/01")).toThrow();
    expect(isValidJalaliDateString("1403/12/31")).toBe(false);
  });

  it("endOfJalaliYear is leap-aware", () => {
    // 1403 is leap in Jalali calendar
    expect(endOfJalaliYear("1403")).toBe("1403/12/30");
    expect(endOfJalaliYear(1404)).toBe("1404/12/29");
  });

  it("addUtcDays stays on UTC midnight", () => {
    const base = jalaliToGregorianDate("1405/05/19");
    const next = addUtcDays(base, 7);
    expect(next.toISOString()).toBe("2026-08-17T00:00:00.000Z");
    expect(gregorianToJalali(next)).toBe("1405/05/26");
  });

  it("todayUtcDate matches todayJalali", () => {
    expect(gregorianToJalali(todayUtcDate())).toBe(todayJalali());
  });
});
