import { describe, expect, it } from "vitest";
import { HealthResponseSchema } from "./health.schema";
describe("HealthResponseSchema", () => {
  it("accepts a valid health payload", () => {
    const result = HealthResponseSchema.parse({
      status: "ok",
      version: "0.1.0",
    });
    expect(result).toEqual({ status: "ok", version: "0.1.0" });
  });

  it("rejects non-ok status", () => {
    expect(() =>
      HealthResponseSchema.parse({ status: "down", version: "0.1.0" }),
    ).toThrow();
  });
});
