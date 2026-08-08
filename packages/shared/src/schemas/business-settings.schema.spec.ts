import { describe, expect, it } from "vitest";
import {
  businessTypeDisplayLabel,
  formatBusinessTitle,
  UpdateBusinessSettingsSchema,
} from "./business-settings.schema";

describe("business settings", () => {
  it("uses custom label for OTHER type", () => {
    expect(businessTypeDisplayLabel("OTHER", "آجیل‌فروشی")).toBe("آجیل‌فروشی");
    expect(businessTypeDisplayLabel("SHOP", null)).toBe("فروشگاه");
  });

  it("formats business title", () => {
    expect(
      formatBusinessTitle({
        businessName: "رضایی",
        businessType: "WORKSHOP",
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
      }),
    ).toBe("کارگاه رضایی");
  });

  it("requires custom name for OTHER", () => {
    expect(() =>
      UpdateBusinessSettingsSchema.parse({
        businessName: "تست",
        businessType: "OTHER",
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
      }),
    ).toThrow();
  });
});
