import { describe, expect, it } from "vitest";
import {
  gregorianToJalali,
  jalaliToGregorianDate,
} from "./jalali";

describe("jalali conversion", () => {
  it("round-trips a known date", () => {
    const g = jalaliToGregorianDate("1403/01/01");
    expect(gregorianToJalali(g)).toBe("1403/01/01");
  });

  it("rejects invalid jalali", () => {
    expect(() => jalaliToGregorianDate("1403/13/01")).toThrow();
  });
});
