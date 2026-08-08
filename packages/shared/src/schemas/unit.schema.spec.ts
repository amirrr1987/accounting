import { describe, expect, it } from "vitest";
import { toBaseQuantity } from "./unit.schema";

describe("toBaseQuantity", () => {
  it("returns same qty when factor is 1", () => {
    expect(toBaseQuantity(5, 1)).toBe(5);
  });

  it("converts with factor", () => {
    expect(toBaseQuantity(2, 12)).toBe(24);
  });
});
