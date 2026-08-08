import { describe, expect, it } from "vitest";
import {
  DEFAULT_ADMIN_PASSWORD,
  DEFAULT_ADMIN_USERNAME,
  LoginSchema,
  canWrite,
  isAdmin,
} from "./auth.schema";

describe("LoginSchema", () => {
  it("accepts default admin credentials", () => {
    const parsed = LoginSchema.parse({
      username: DEFAULT_ADMIN_USERNAME,
      password: DEFAULT_ADMIN_PASSWORD,
    });
    expect(parsed.username).toBe("admin");
  });

  it("rejects empty password", () => {
    expect(() =>
      LoginSchema.parse({ username: "admin", password: "" }),
    ).toThrow();
  });
});

describe("role helpers", () => {
  it("canWrite allows admin and accountant", () => {
    expect(canWrite("ADMIN")).toBe(true);
    expect(canWrite("ACCOUNTANT")).toBe(true);
    expect(canWrite("VIEWER")).toBe(false);
  });

  it("isAdmin only for admin", () => {
    expect(isAdmin("ADMIN")).toBe(true);
    expect(isAdmin("ACCOUNTANT")).toBe(false);
  });
});
