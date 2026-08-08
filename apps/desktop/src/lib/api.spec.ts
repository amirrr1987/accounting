import { describe, expect, it, vi, beforeEach } from "vitest";
import { HealthResponseSchema } from "@hesabyar/shared";

vi.mock("axios", () => {
  const get = vi.fn();
  return {
    default: {
      create: () => ({ get }),
      __get: get,
    },
  };
});

describe("fetchHealth", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("parses a valid health response through Zod", async () => {
    const payload = { status: "ok", version: "0.1.0" };
    expect(HealthResponseSchema.parse(payload)).toEqual(payload);
  });

  it("rejects invalid health payloads", () => {
    expect(() =>
      HealthResponseSchema.parse({ status: "error", version: "0.1.0" }),
    ).toThrow();
  });
});
