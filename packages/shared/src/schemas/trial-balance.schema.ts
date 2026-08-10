import { z } from "zod";
import { AccountLevelSchema, AccountNatureSchema, AccountTypeSchema } from "./account.schema";
import { movementDelta } from "./ledger.schema";
import { JalaliDateStringSchema } from "./jalali-date.schema";

export const TrialBalanceQuerySchema = z.object({
  /** تاریخ مقطع شمسی — شامل خود روز */
  asOfJalali: JalaliDateStringSchema,
});

export type TrialBalanceQuery = z.infer<typeof TrialBalanceQuerySchema>;

export const TrialBalanceRowSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  level: AccountLevelSchema,
  type: AccountTypeSchema,
  nature: AccountNatureSchema,
  debit: z.string(),
  credit: z.string(),
});

export type TrialBalanceRow = z.infer<typeof TrialBalanceRowSchema>;

export type TrialBalanceTreeNode = {
  key: string;
  data: TrialBalanceRow;
  children?: TrialBalanceTreeNode[];
};

export const TrialBalanceTreeNodeSchema: z.ZodType<TrialBalanceTreeNode> =
  z.lazy(() =>
    z.object({
      key: z.string(),
      data: TrialBalanceRowSchema,
      children: z.array(TrialBalanceTreeNodeSchema).optional(),
    }),
  );

export const TrialBalanceReportSchema = z.object({
  asOfJalali: z.string(),
  asOfGregorian: z.string(),
  generatedAt: z.string().datetime(),
  totalDebit: z.string(),
  totalCredit: z.string(),
  /** اگر معادله تراز به‌هم بخورد true — برای تشخیص خطا */
  isBalanced: z.boolean(),
  tree: z.array(TrialBalanceTreeNodeSchema),
});

export type TrialBalanceReport = z.infer<typeof TrialBalanceReportSchema>;

/** تبدیل مانده خالص به ستون بدهکار/بستانکار تراز آزمایشی */
export function balanceToDebitCredit(
  nature: z.infer<typeof AccountNatureSchema>,
  net: bigint,
): { debit: bigint; credit: bigint } {
  if (net === 0n) return { debit: 0n, credit: 0n };
  if (nature === "DEBIT") {
    return net > 0n
      ? { debit: net, credit: 0n }
      : { debit: 0n, credit: -net };
  }
  return net > 0n
    ? { debit: 0n, credit: net }
    : { debit: -net, credit: 0n };
}

export function netFromMovements(
  nature: z.infer<typeof AccountNatureSchema>,
  totalDebit: bigint,
  totalCredit: bigint,
): bigint {
  return movementDelta(nature, totalDebit, totalCredit);
}

type FlatAccount = {
  id: string;
  code: string;
  name: string;
  level: z.infer<typeof AccountLevelSchema>;
  type: z.infer<typeof AccountTypeSchema>;
  nature: z.infer<typeof AccountNatureSchema>;
  parentId: string | null;
  debit: bigint;
  credit: bigint;
};

/** ساخت درخت گروه→کل→معین با جمع از روی تفصیلی */
export function buildTrialBalanceTree(
  accounts: FlatAccount[],
): TrialBalanceTreeNode[] {
  const byId = new Map(accounts.map((a) => [a.id, { ...a }]));

  // از برگ به ریشه جمع بزن
  const childrenOf = new Map<string, string[]>();
  for (const a of accounts) {
    if (!a.parentId) continue;
    const list = childrenOf.get(a.parentId) ?? [];
    list.push(a.id);
    childrenOf.set(a.parentId, list);
  }

  const rolled = new Map<string, { debit: bigint; credit: bigint }>();

  const rollup = (id: string): { debit: bigint; credit: bigint } => {
    const cached = rolled.get(id);
    if (cached) return cached;

    const node = byId.get(id);
    if (!node) return { debit: 0n, credit: 0n };

    const kids = childrenOf.get(id) ?? [];
    if (kids.length === 0) {
      const leaf = { debit: node.debit, credit: node.credit };
      rolled.set(id, leaf);
      return leaf;
    }

    let debit = 0n;
    let credit = 0n;
    for (const kid of kids) {
      const r = rollup(kid);
      debit += r.debit;
      credit += r.credit;
    }
    const agg = { debit, credit };
    rolled.set(id, agg);
    return agg;
  };

  for (const a of accounts) {
    rollup(a.id);
  }

  const toNode = (id: string): TrialBalanceTreeNode | null => {
    const a = byId.get(id);
    if (!a) return null;
    // فقط گروه / کل / معین در درخت نمایش (تفصیلی در جمع لحاظ شده)
    if (a.level === "DETAIL") return null;

    const amounts = rolled.get(id) ?? { debit: 0n, credit: 0n };
    const childIds = childrenOf.get(id) ?? [];
    const children = childIds
      .map(toNode)
      .filter((n): n is TrialBalanceTreeNode => n !== null)
      .sort((x, y) => x.data.code.localeCompare(y.data.code, "fa"));

    return {
      key: a.id,
      data: {
        id: a.id,
        code: a.code,
        name: a.name,
        level: a.level,
        type: a.type,
        nature: a.nature,
        debit: amounts.debit.toString(),
        credit: amounts.credit.toString(),
      },
      children: children.length ? children : undefined,
    };
  };

  const roots = accounts
    .filter((a) => a.parentId === null && a.level === "GROUP")
    .sort((a, b) => a.code.localeCompare(b.code, "fa"))
    .map((a) => toNode(a.id))
    .filter((n): n is TrialBalanceTreeNode => n !== null);

  return roots;
}

/** جمع ستون‌های بدهکار/بستانکار فقط روی حساب‌های تفصیلی */
export function sumDetailColumns(accounts: FlatAccount[]): {
  totalDebit: bigint;
  totalCredit: bigint;
} {
  let totalDebit = 0n;
  let totalCredit = 0n;
  for (const a of accounts) {
    if (a.level !== "DETAIL") continue;
    totalDebit += a.debit;
    totalCredit += a.credit;
  }
  return { totalDebit, totalCredit };
}
