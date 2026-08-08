import { describe, expect, it } from "vitest";
import {
  DISPLAY_UNIT_LABELS,
  displayUnitDivisor,
  formatMoneyRial,
  formatMoneyWithUnit,
  parseDisplayInputToRial,
} from "./money-display";

describe("money display", () => {
  it("maps divisors", () => {
    expect(displayUnitDivisor("RIAL")).toBe(1);
    expect(displayUnitDivisor("TOMAN")).toBe(10);
    expect(displayUnitDivisor("THOUSAND_RIAL")).toBe(1000);
    expect(displayUnitDivisor("THOUSAND_TOMAN")).toBe(10_000);
  });

  it("formats toman from rial", () => {
    expect(formatMoneyRial(1_000n, "TOMAN")).toMatch(/۱[\s\u00A0]?۰۰/);
    expect(formatMoneyWithUnit(1_000n, "TOMAN")).toContain(
      DISPLAY_UNIT_LABELS.TOMAN,
    );
  });

  it("formats thousand units with fraction when needed", () => {
    expect(formatMoneyRial(1500n, "THOUSAND_RIAL")).toBe("۱٫۵");
  });

  it("parses display input to rial", () => {
    expect(parseDisplayInputToRial("۱۰۰", "TOMAN")).toBe("1000");
    expect(parseDisplayInputToRial("5", "THOUSAND_TOMAN")).toBe("50000");
  });
});
