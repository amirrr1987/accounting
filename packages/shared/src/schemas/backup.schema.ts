import { z } from "zod";

/** نسخه فرمت پشتیبان — برای سازگاری بازیابی */
export const BACKUP_FORMAT_VERSION = 1;

export const BackupMetaSchema = z.object({
  version: z.literal(BACKUP_FORMAT_VERSION),
  exportedAt: z.string().datetime(),
  exportedBy: z.string(),
});
export type BackupMeta = z.infer<typeof BackupMetaSchema>;

export const BackupSnapshotSchema = z.object({
  version: z.literal(BACKUP_FORMAT_VERSION),
  exportedAt: z.string().datetime(),
  exportedBy: z.string(),
  accounts: z.array(z.record(z.unknown())),
  parties: z.array(z.record(z.unknown())),
  products: z.array(z.record(z.unknown())),
  fiscalYears: z.array(z.record(z.unknown())),
  vouchers: z.array(z.record(z.unknown())),
  voucherLines: z.array(z.record(z.unknown())),
  invoices: z.array(z.record(z.unknown())),
  invoiceLines: z.array(z.record(z.unknown())),
  voucherSequence: z.number().int().nonnegative(),
  invoiceSequence: z.number().int().nonnegative(),
  users: z.array(z.record(z.unknown())),
});
export type BackupSnapshot = z.infer<typeof BackupSnapshotSchema>;

export const RestoreResultSchema = z.object({
  ok: z.literal(true),
  restoredAt: z.string().datetime(),
  tables: z.object({
    accounts: z.number().int(),
    parties: z.number().int(),
    products: z.number().int(),
    vouchers: z.number().int(),
    invoices: z.number().int(),
    users: z.number().int(),
  }),
});
export type RestoreResult = z.infer<typeof RestoreResultSchema>;
