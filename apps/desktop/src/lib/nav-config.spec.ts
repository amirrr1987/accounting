import { describe, expect, it } from "vitest";
import {
  groupedNavItems,
  isNavActive,
  mobilePrimaryTabs,
  navLabel,
  visibleNavItems,
} from "./nav-config";

describe("nav-config", () => {
  it("hides pro-only items in simple mode", () => {
    const simple = visibleNavItems("simple");
    const pro = visibleNavItems("pro");
    expect(simple.length).toBeLessThan(pro.length);
    expect(simple.some((i) => i.id === "vouchers")).toBe(false);
    expect(pro.some((i) => i.id === "vouchers")).toBe(true);
  });

  it("groups navigation for sidebar", () => {
    const groups = groupedNavItems("simple");
    expect(groups.length).toBeGreaterThan(0);
    expect(groups[0]?.items.length).toBeGreaterThan(0);
  });

  it("uses simple labels in simple mode", () => {
    const payments = visibleNavItems("simple").find((i) => i.id === "payments");
    expect(payments).toBeDefined();
    expect(navLabel(payments!, "simple")).toContain("پول");
  });

  it("detects active routes", () => {
    expect(isNavActive("/invoices", "/invoices/new")).toBe(true);
    expect(isNavActive("/", "/reports")).toBe(false);
    expect(isNavActive("/payments/new", "/payments/new")).toBe(true);
  });

  it("exposes four primary mobile tabs plus menu", () => {
    expect(mobilePrimaryTabs()).toHaveLength(4);
  });
});
