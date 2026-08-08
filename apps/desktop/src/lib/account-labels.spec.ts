import { describe, expect, it } from "vitest";
import { ACCOUNT_TYPE_LABELS } from "./account-labels";

describe("account labels", () => {
  it("covers all Iranian account types", () => {
    expect(Object.keys(ACCOUNT_TYPE_LABELS).sort()).toEqual(
      ["ASSET", "EQUITY", "EXPENSE", "INCOME", "LIABILITY"].sort(),
    );
  });
});
