import { describe, expect, it, beforeEach } from "vitest";
import { applyMoneyDisplaySettings } from "@/composables/useMoneyDisplay";
import { formatMoneyFa, parseMoneyInput } from "./money";

describe("money", () => {
  beforeEach(() => {
    applyMoneyDisplaySettings({
      businessName: "تست",
      businessType: "SHOP",
      businessTypeCustom: null,
      legalName: null,
      nationalId: null,
      economicCode: null,
      phone: null,
      mobile: null,
      address: null,
      city: null,
      postalCode: null,
      description: null,
      displayUnit: "RIAL",
      inputUnit: "RIAL",
      moneyDisplayConfigured: true,
    });
  });

  it("formats rial by default", () => {
    expect(formatMoneyFa(1000)).toMatch(/۱/);
  });

  it("parses plain digits as rial", () => {
    expect(parseMoneyInput("۱٬۰۰۰")).toBe("1000");
    expect(parseMoneyInput("")).toBe("0");
  });

  it("converts toman input to rial", () => {
    applyMoneyDisplaySettings({
      businessName: "تست",
      businessType: "SHOP",
      businessTypeCustom: null,
      legalName: null,
      nationalId: null,
      economicCode: null,
      phone: null,
      mobile: null,
      address: null,
      city: null,
      postalCode: null,
      description: null,
      displayUnit: "TOMAN",
      inputUnit: "TOMAN",
      moneyDisplayConfigured: true,
    });
    expect(parseMoneyInput("100")).toBe("1000");
    expect(formatMoneyFa(1000)).toMatch(/۱[\s\u00A0]?۰۰/);
  });
});
