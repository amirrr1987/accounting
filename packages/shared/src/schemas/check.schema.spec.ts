import { describe, expect, it } from "vitest";
import {
  CreateCheckSchema,
  assertCheckStatusTransition,
} from "./check.schema";

describe("CheckDetailsSchema", () => {
  const valid = {
    sayyadNumber: "1234567890123456",
    issueJalali: "1405/01/01",
    dueJalali: "1405/02/01",
    drawerNationalId: "1234567890",
    drawerMobile: "09123456789",
    bankName: "ملت",
  };

  it("accepts valid sayyad check via CreateCheckSchema", () => {
    const parsed = CreateCheckSchema.parse({
      kind: "RECEIVABLE",
      partyId: "00000000-0000-4000-8000-000000000001",
      amount: "1000000",
      dateJalali: "1405/01/01",
      ...valid,
    });
    expect(parsed.sayyadNumber).toBe(valid.sayyadNumber);
  });

  it("rejects invalid sayyad number", () => {
    expect(() =>
      CreateCheckSchema.parse({
        kind: "RECEIVABLE",
        partyId: "00000000-0000-4000-8000-000000000001",
        amount: "1000000",
        dateJalali: "1405/01/01",
        ...valid,
        sayyadNumber: "123",
      }),
    ).toThrow();
  });

  it("rejects due date before issue date", () => {
    expect(() =>
      CreateCheckSchema.parse({
        kind: "RECEIVABLE",
        partyId: "00000000-0000-4000-8000-000000000001",
        amount: "1000000",
        dateJalali: "1405/01/01",
        ...valid,
        issueJalali: "1405/03/01",
        dueJalali: "1405/02/01",
      }),
    ).toThrow();
  });
});

describe("assertCheckStatusTransition", () => {
  it("allows receivable portfolio to deposited", () => {
    expect(() =>
      assertCheckStatusTransition("RECEIVABLE", "IN_PORTFOLIO", "DEPOSITED"),
    ).not.toThrow();
  });

  it("allows receivable deposited to cleared", () => {
    expect(() =>
      assertCheckStatusTransition("RECEIVABLE", "DEPOSITED", "CLEARED"),
    ).not.toThrow();
  });

  it("rejects payable paid from portfolio to deposited", () => {
    expect(() =>
      assertCheckStatusTransition("PAYABLE", "IN_PORTFOLIO", "DEPOSITED"),
    ).toThrow();
  });
});
