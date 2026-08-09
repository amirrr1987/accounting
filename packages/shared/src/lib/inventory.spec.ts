import { describe, expect, it } from "vitest";
import {
  assertFiscalDateWritable,
  weightedAverageCost,
  lineCogsCost,
  assertStockAvailable,
  calcLineSaleLoss,
} from "./inventory";

describe("assertFiscalDateWritable", () => {
  const fy = {
    title: "1403",
    startJalali: "1403/01/01",
    endJalali: "1403/12/29",
    isClosed: false,
    closedThroughJalali: "1403/06/30",
  };

  it("allows date after closedThrough", () => {
    expect(() =>
      assertFiscalDateWritable("1403/07/01", fy),
    ).not.toThrow();
  });

  it("blocks date on or before closedThrough", () => {
    expect(() =>
      assertFiscalDateWritable("1403/06/30", fy),
    ).toThrow(/بسته شده/);
  });

  it("blocks closed year", () => {
    expect(() =>
      assertFiscalDateWritable("1403/07/01", { ...fy, isClosed: true }),
    ).toThrow(/بسته است/);
  });

  it("blocks writes when no active fiscal year", () => {
    expect(() => assertFiscalDateWritable("1403/07/01", null)).toThrow(
      /سال مالی فعال/,
    );
  });
});

describe("weightedAverageCost", () => {
  it("computes average", () => {
    expect(weightedAverageCost(10, 1000n, 10, 2000n)).toBe(1500n);
  });
});

describe("lineCogsCost", () => {
  it("multiplies qty by cost", () => {
    expect(lineCogsCost(3, 5000n)).toBe(15000n);
  });
});

describe("assertStockAvailable", () => {
  it("passes when stock is sufficient", () => {
    expect(() => assertStockAvailable("کالا", 10, 5)).not.toThrow();
  });

  it("throws when stock is insufficient", () => {
    expect(() => assertStockAvailable("کالا", 3, 5)).toThrow(/موجودی/);
  });
});

describe("calcLineSaleLoss", () => {
  it("returns zero when selling above cost", () => {
    expect(calcLineSaleLoss(2, 100_000n, 60_000n)).toBe(0n);
  });

  it("computes loss when selling below cost", () => {
    expect(calcLineSaleLoss(2, 50_000n, 60_000n)).toBe(20_000n);
  });

  it("accounts for line discount", () => {
    expect(calcLineSaleLoss(1, 100_000n, 80_000n, 30_000n)).toBe(10_000n);
  });
});
