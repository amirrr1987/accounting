import { describe, expect, it } from "vitest";
import { formatMoneyFa, parseMoneyInput } from "./money";

describe("money helpers", () => {
  it("formats fa-IR", () => {
    expect(formatMoneyFa(1000)).toMatch(/۱/);
  });

  it("parses persian digits and separators", () => {
    expect(parseMoneyInput("۱٬۰۰۰")).toBe("1000");
    expect(parseMoneyInput("")).toBe("0");
  });
});
