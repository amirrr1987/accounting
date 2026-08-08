import { describe, expect, it } from "vitest";
import {
  AccountSchema,
  CreateAccountSchema,
  defaultNatureForType,
} from "./account.schema";

describe("AccountSchema", () => {
  const sample = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    code: "11101",
    name: "صندوق",
    type: "ASSET" as const,
    nature: "DEBIT" as const,
    level: "DETAIL" as const,
    parentId: "550e8400-e29b-41d4-a716-446655440001",
    isActive: true,
  };

  it("accepts a valid account", () => {
    expect(AccountSchema.parse(sample)).toMatchObject(sample);
  });

  it("rejects empty code", () => {
    expect(() => AccountSchema.parse({ ...sample, code: "" })).toThrow();
  });
});

describe("CreateAccountSchema", () => {
  it("defaults isActive to true", () => {
    const result = CreateAccountSchema.parse({
      code: "1",
      name: "دارایی‌ها",
      type: "ASSET",
      nature: "DEBIT",
      level: "GROUP",
    });
    expect(result.isActive).toBe(true);
  });
});

describe("defaultNatureForType", () => {
  it("maps Iranian natures correctly", () => {
    expect(defaultNatureForType("ASSET")).toBe("DEBIT");
    expect(defaultNatureForType("EXPENSE")).toBe("DEBIT");
    expect(defaultNatureForType("LIABILITY")).toBe("CREDIT");
    expect(defaultNatureForType("EQUITY")).toBe("CREDIT");
    expect(defaultNatureForType("INCOME")).toBe("CREDIT");
  });
});
