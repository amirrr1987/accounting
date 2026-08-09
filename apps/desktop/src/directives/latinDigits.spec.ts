import { describe, expect, it } from "vitest";
import { toAsciiDigits } from "@hesabyar/shared";

describe("latin digits conversion (directive helper)", () => {
  it("normalizes pasted persian amounts", () => {
    expect(toAsciiDigits("۱٬۲۳۴")).toBe("1٬234");
  });

  it("normalizes mixed keyboard input", () => {
    expect(toAsciiDigits("12۳۴")).toBe("1234");
  });
});
