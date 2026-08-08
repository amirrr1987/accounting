import { z } from "zod";

export const BankAccountSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  bankName: z.string(),
  accountNumber: z.string().nullable(),
  sheba: z.string().nullable(),
  coaAccountId: z.string().uuid(),
  coaAccountCode: z.string(),
  coaAccountName: z.string(),
  currentBalance: z.string(),
  isActive: z.boolean(),
});
export type BankAccount = z.infer<typeof BankAccountSchema>;

export const CreateBankAccountSchema = z.object({
  name: z.string().min(1).max(200),
  bankName: z.string().min(1).max(200),
  accountNumber: z.string().max(64).nullable().optional(),
  sheba: z.string().max(26).nullable().optional(),
  isActive: z.boolean().optional().default(true),
});
export type CreateBankAccountInput = z.infer<typeof CreateBankAccountSchema>;

export const BankAccountListSchema = z.array(BankAccountSchema);
