import { describe, expect, it } from "vitest";
import { BACKUP_FORMAT_VERSION, BackupSnapshotSchema } from "./backup.schema";

describe("BackupSnapshotSchema", () => {
  it("accepts minimal empty snapshot", () => {
    const snapshot = BackupSnapshotSchema.parse({
      version: BACKUP_FORMAT_VERSION,
      exportedAt: new Date().toISOString(),
      exportedBy: "admin",
      accounts: [],
      parties: [],
      products: [],
      fiscalYears: [],
      vouchers: [],
      voucherLines: [],
      invoices: [],
      invoiceLines: [],
      voucherSequence: 0,
      invoiceSequence: 0,
      users: [],
    });
    expect(snapshot.version).toBe(1);
  });
});
