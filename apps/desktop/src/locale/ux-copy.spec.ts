import { describe, expect, it } from "vitest";
import { ux } from "@/locale/ux-copy";

describe("ux copy", () => {
  it("keeps action-oriented CTAs", () => {
    expect(ux.auth.submit).toContain("ورود");
    expect(ux.vouchers.create).toBe("سند جدید");
    expect(ux.invoices.emptyCta.length).toBeGreaterThan(3);
  });

  it("explains next steps in empty and error states", () => {
    expect(ux.auth.errorDetail).toMatch(/تلاش/);
    expect(ux.vouchers.emptyBody).toMatch(/متوازن/);
    expect(ux.dashboard.balanceBad).toMatch(/به‌هم/);
  });
});
