import { describe, expect, it } from "vitest";
import { hasNonAsciiDigits, toAsciiDigits } from "./digits";

describe("toAsciiDigits", () => {
  it("converts Persian digits", () => {
    expect(toAsciiDigits("۱۲۳۴۵۶۷۸۹۰")).toBe("1234567890");
  });

  it("converts Arabic-Indic digits", () => {
    expect(toAsciiDigits("٠١٢٣٤٥٦٧٨٩")).toBe("0123456789");
  });

  it("keeps ascii and surrounding text", () => {
    expect(toAsciiDigits("مبلغ ۱۲۰٬۰۰۰ ریال")).toBe("مبلغ 120٬000 ریال");
    expect(toAsciiDigits("12.5")).toBe("12.5");
  });

  it("is idempotent on ascii", () => {
    expect(toAsciiDigits("9801")).toBe("9801");
  });
});

describe("hasNonAsciiDigits", () => {
  it("detects persian digits", () => {
    expect(hasNonAsciiDigits("۱۲")).toBe(true);
    expect(hasNonAsciiDigits("12")).toBe(false);
  });
});
