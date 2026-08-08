import { z } from "zod";

/** نوع حساب طبق استاندارد حسابداری ایران */
export const AccountTypeSchema = z.enum([
  "ASSET",
  "LIABILITY",
  "EQUITY",
  "INCOME",
  "EXPENSE",
]);
export type AccountType = z.infer<typeof AccountTypeSchema>;

/** ماهیت حساب — بدهکار یا بستانکار */
export const AccountNatureSchema = z.enum(["DEBIT", "CREDIT"]);
export type AccountNature = z.infer<typeof AccountNatureSchema>;

/**
 * سطح سرفصل:
 * GROUP (گروه) → TOTAL (کل) → SUBTOTAL (معین) → DETAIL (تفصیلی)
 */
export const AccountLevelSchema = z.enum([
  "GROUP",
  "TOTAL",
  "SUBTOTAL",
  "DETAIL",
]);
export type AccountLevel = z.infer<typeof AccountLevelSchema>;

export const AccountSchema = z.object({
  id: z.string().uuid(),
  code: z.string().min(1).max(32),
  name: z.string().min(1).max(200),
  type: AccountTypeSchema,
  nature: AccountNatureSchema,
  level: AccountLevelSchema,
  parentId: z.string().uuid().nullable(),
  isActive: z.boolean(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});
export type Account = z.infer<typeof AccountSchema>;

export const CreateAccountSchema = z.object({
  code: z.string().min(1).max(32),
  name: z.string().min(1).max(200),
  type: AccountTypeSchema,
  nature: AccountNatureSchema,
  level: AccountLevelSchema,
  parentId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional().default(true),
});
export type CreateAccountInput = z.infer<typeof CreateAccountSchema>;

export const UpdateAccountSchema = CreateAccountSchema.partial();
export type UpdateAccountInput = z.infer<typeof UpdateAccountSchema>;

export const AccountListSchema = z.array(AccountSchema);
export type AccountList = z.infer<typeof AccountListSchema>;

/** گره درختی برای نمایش TreeTable */
export type AccountTreeNode = {
  key: string;
  data: Account;
  children?: AccountTreeNode[];
};

export const AccountTreeNodeSchema: z.ZodType<AccountTreeNode> = z.lazy(() =>
  z.object({
    key: z.string(),
    data: AccountSchema,
    children: z.array(AccountTreeNodeSchema).optional(),
  }),
);

export const AccountTreeSchema = z.array(AccountTreeNodeSchema);

/** ماهیت پیش‌فرض بر اساس نوع حساب */
export function defaultNatureForType(type: AccountType): AccountNature {
  switch (type) {
    case "ASSET":
    case "EXPENSE":
      return "DEBIT";
    case "LIABILITY":
    case "EQUITY":
    case "INCOME":
      return "CREDIT";
  }
}
