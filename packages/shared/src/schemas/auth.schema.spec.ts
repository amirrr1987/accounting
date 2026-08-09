import { describe, expect, it } from "vitest";
import {
  ChangePasswordSchema,
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

  it("rejects oversized username", () => {
    expect(() =>
      LoginSchema.parse({
        username: "a".repeat(65),
        password: "admin",
      }),
    ).toThrow();
  });
});

describe("ChangePasswordSchema", () => {
  it("rejects default admin as new password", () => {
    expect(() =>
      ChangePasswordSchema.parse({
        currentPassword: "admin",
        newPassword: "admin",
        confirmPassword: "admin",
      }),
    ).toThrow();
  });

  it("accepts a strong enough new password", () => {
    const parsed = ChangePasswordSchema.parse({
      currentPassword: "admin",
      newPassword: "Secret1",
      confirmPassword: "Secret1",
    });
    expect(parsed.newPassword).toBe("Secret1");
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
