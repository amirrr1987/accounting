import { describe, expect, it } from "vitest";
import {
  assertFiscalDateWritable,
  weightedAverageCost,
  lineCogsCost,
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
