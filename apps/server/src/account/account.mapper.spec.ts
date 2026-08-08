import { buildAccountTree } from "./account.mapper";
import type { Account } from "@hesabyar/shared";

describe("buildAccountTree", () => {
  const accounts: Account[] = [
    {
      id: "g1",
      code: "1",
      name: "دارایی‌ها",
      type: "ASSET",
      nature: "DEBIT",
      level: "GROUP",
      parentId: null,
      isActive: true,
    },
    {
      id: "t1",
      code: "11",
      name: "جاری",
      type: "ASSET",
      nature: "DEBIT",
      level: "TOTAL",
      parentId: "g1",
      isActive: true,
    },
    {
      id: "s1",
      code: "111",
      name: "نقد",
      type: "ASSET",
      nature: "DEBIT",
      level: "SUBTOTAL",
      parentId: "t1",
      isActive: true,
    },
  ];

  it("builds a 3-level tree", () => {
    const tree = buildAccountTree(accounts);
    expect(tree).toHaveLength(1);
    expect(tree[0].data.code).toBe("1");
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children![0].children).toHaveLength(1);
    expect(tree[0].children![0].children![0].data.code).toBe("111");
  });
});
