import { describe, expect, it } from "vitest";
import {
  LoginClientMetaSchema,
  LoginEventQuerySchema,
  LoginSchema,
} from "../index";

describe("LoginClientMetaSchema", () => {
  it("accepts desktop meta", () => {
    const parsed = LoginClientMetaSchema.parse({
      clientType: "DESKTOP",
      appVersion: "0.1.0",
      platform: "Win32",
      timezone: "Asia/Tehran",
      locale: "fa-IR",
      screen: "1920x1080",
      correlationId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(parsed.clientType).toBe("DESKTOP");
  });

  it("rejects invalid screen format", () => {
    expect(() =>
      LoginClientMetaSchema.parse({ screen: "full-hd" }),
    ).toThrow();
  });
});

describe("LoginSchema with client", () => {
  it("trims username and keeps client", () => {
    const parsed = LoginSchema.parse({
      username: "  admin  ",
      password: "admin",
      client: { clientType: "WEB" },
    });
    expect(parsed.username).toBe("admin");
    expect(parsed.client?.clientType).toBe("WEB");
  });

  it("rejects illegal username characters", () => {
    expect(() =>
      LoginSchema.parse({ username: "bad user", password: "x" }),
    ).toThrow();
  });
});

describe("LoginEventQuerySchema", () => {
  it("coerces success query string", () => {
    const parsed = LoginEventQuerySchema.parse({ success: "true", limit: "10" });
    expect(parsed.success).toBe(true);
    expect(parsed.limit).toBe(10);
  });
});
