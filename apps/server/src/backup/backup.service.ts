import {
  BadRequestException,
  Injectable,
} from "@nestjs/common";
import {
  BACKUP_FORMAT_VERSION,
  BackupSnapshotSchema,
  RestoreResultSchema,
  type BackupSnapshot,
  type RestoreResult,
} from "@hesabyar/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

function serializeRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (typeof value === "bigint") {
      out[key] = value.toString();
    } else if (value instanceof Date) {
      out[key] = value.toISOString();
    } else {
      out[key] = value;
    }
  }
  return out;
}

function asDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === "string") return new Date(value);
  throw new BadRequestException("تاریخ نامعتبر در پشتیبان");
}

function asBigInt(value: unknown): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(Math.trunc(value));
  if (typeof value === "string") return BigInt(value);
  throw new BadRequestException("مبلغ نامعتبر در پشتیبان");
}

@Injectable()
export class BackupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async exportSnapshot(username: string): Promise<BackupSnapshot> {
    const [
      accounts,
      parties,
      products,
      fiscalYears,
      vouchers,
      voucherLines,
      invoices,
      invoiceLines,
      voucherSeq,
      invoiceSeq,
      users,
    ] = await Promise.all([
      this.prisma.account.findMany(),
      this.prisma.party.findMany(),
      this.prisma.product.findMany(),
      this.prisma.fiscalYear.findMany(),
      this.prisma.voucher.findMany(),
      this.prisma.voucherLine.findMany(),
      this.prisma.invoice.findMany(),
      this.prisma.invoiceLine.findMany(),
      this.prisma.voucherSequence.findUnique({ where: { id: 1 } }),
      this.prisma.invoiceSequence.findUnique({ where: { id: 1 } }),
      this.prisma.user.findMany(),
    ]);

    const snapshot = BackupSnapshotSchema.parse({
      version: BACKUP_FORMAT_VERSION,
      exportedAt: new Date().toISOString(),
      exportedBy: username,
      accounts: accounts.map((r) => serializeRow(r as Record<string, unknown>)),
      parties: parties.map((r) => serializeRow(r as Record<string, unknown>)),
      products: products.map((r) => serializeRow(r as Record<string, unknown>)),
      fiscalYears: fiscalYears.map((r) =>
        serializeRow(r as Record<string, unknown>),
      ),
      vouchers: vouchers.map((r) => serializeRow(r as Record<string, unknown>)),
      voucherLines: voucherLines.map((r) =>
        serializeRow(r as Record<string, unknown>),
      ),
      invoices: invoices.map((r) => serializeRow(r as Record<string, unknown>)),
      invoiceLines: invoiceLines.map((r) =>
        serializeRow(r as Record<string, unknown>),
      ),
      voucherSequence: voucherSeq?.value ?? 0,
      invoiceSequence: invoiceSeq?.value ?? 0,
      users: users.map((r) => serializeRow(r as Record<string, unknown>)),
    });

    await this.audit.log({
      username,
      action: "EXPORT",
      entity: "backup",
      detail: `حساب=${accounts.length} سند=${vouchers.length} فاکتور=${invoices.length}`,
    });

    return snapshot;
  }

  async restoreSnapshot(
    raw: unknown,
    username: string,
    userId: string,
  ): Promise<RestoreResult> {
    const snapshot = BackupSnapshotSchema.parse(raw);

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.invoiceLine.deleteMany();
      await tx.invoice.deleteMany();
      await tx.voucherLine.deleteMany();
      await tx.voucher.deleteMany();
      await tx.product.deleteMany();
      await tx.party.deleteMany();
      await tx.fiscalYear.deleteMany();

      for (const level of ["DETAIL", "SUBTOTAL", "TOTAL", "GROUP"] as const) {
        await tx.account.deleteMany({ where: { level } });
      }

      for (const row of snapshot.accounts) {
        await tx.account.create({
          data: {
            id: String(row.id),
            code: String(row.code),
            name: String(row.name),
            type: row.type as never,
            nature: row.nature as never,
            level: row.level as never,
            parentId: row.parentId ? String(row.parentId) : null,
            isActive: Boolean(row.isActive),
            createdAt: asDate(row.createdAt),
            updatedAt: asDate(row.updatedAt),
          },
        });
      }

      for (const row of snapshot.parties) {
        await tx.party.create({
          data: {
            id: String(row.id),
            kind: row.kind as never,
            name: String(row.name),
            phone: row.phone ? String(row.phone) : null,
            nationalId: row.nationalId ? String(row.nationalId) : null,
            isActive: Boolean(row.isActive),
            createdAt: asDate(row.createdAt),
            updatedAt: asDate(row.updatedAt),
          },
        });
      }

      for (const row of snapshot.products) {
        await tx.product.create({
          data: {
            id: String(row.id),
            sku: String(row.sku),
            name: String(row.name),
            unitPrice: asBigInt(row.unitPrice),
            costPrice: asBigInt(row.costPrice ?? 0),
            stockQty: Number(row.stockQty ?? 0),
            vatRate: Number(row.vatRate),
            isActive: Boolean(row.isActive),
            createdAt: asDate(row.createdAt),
            updatedAt: asDate(row.updatedAt),
          },
        });
      }

      for (const row of snapshot.fiscalYears) {
        await tx.fiscalYear.create({
          data: {
            id: String(row.id),
            title: String(row.title),
            startJalali: String(row.startJalali),
            endJalali: String(row.endJalali),
            isClosed: Boolean(row.isClosed),
            isActive: Boolean(row.isActive),
            closedThroughJalali: row.closedThroughJalali
              ? String(row.closedThroughJalali)
              : null,
            createdAt: asDate(row.createdAt),
            updatedAt: asDate(row.updatedAt),
          },
        });
      }

      for (const row of snapshot.vouchers) {
        await tx.voucher.create({
          data: {
            id: String(row.id),
            number: String(row.number),
            kind: row.kind as never,
            date: asDate(row.date),
            description: String(row.description),
            reversedOfId: row.reversedOfId ? String(row.reversedOfId) : null,
            createdAt: asDate(row.createdAt),
            updatedAt: asDate(row.updatedAt),
          },
        });
      }

      for (const row of snapshot.voucherLines) {
        await tx.voucherLine.create({
          data: {
            id: String(row.id),
            voucherId: String(row.voucherId),
            accountId: String(row.accountId),
            partyId: row.partyId ? String(row.partyId) : null,
            description: String(row.description ?? ""),
            debit: asBigInt(row.debit),
            credit: asBigInt(row.credit),
            lineOrder: Number(row.lineOrder),
          },
        });
      }

      for (const row of snapshot.invoices) {
        await tx.invoice.create({
          data: {
            id: String(row.id),
            number: String(row.number),
            kind: row.kind as never,
            partyId: String(row.partyId),
            date: asDate(row.date),
            description: String(row.description ?? ""),
            subtotal: asBigInt(row.subtotal),
            vatAmount: asBigInt(row.vatAmount),
            headerDiscount: asBigInt(row.headerDiscount ?? 0),
            total: asBigInt(row.total),
            voucherId: row.voucherId ? String(row.voucherId) : null,
            deletedAt: row.deletedAt ? asDate(row.deletedAt) : null,
            createdAt: asDate(row.createdAt),
            updatedAt: asDate(row.updatedAt),
          },
        });
      }

      for (const row of snapshot.invoiceLines) {
        await tx.invoiceLine.create({
          data: {
            id: String(row.id),
            invoiceId: String(row.invoiceId),
            productId: String(row.productId),
            quantity: Number(row.quantity),
            unitPrice: asBigInt(row.unitPrice),
            vatRate: Number(row.vatRate),
            discountAmount: asBigInt(row.discountAmount ?? 0),
            lineNet: asBigInt(row.lineNet),
            lineVat: asBigInt(row.lineVat),
            lineTotal: asBigInt(row.lineTotal),
            lineOrder: Number(row.lineOrder),
          },
        });
      }

      await tx.voucherSequence.upsert({
        where: { id: 1 },
        create: { id: 1, value: snapshot.voucherSequence },
        update: { value: snapshot.voucherSequence },
      });
      await tx.invoiceSequence.upsert({
        where: { id: 1 },
        create: { id: 1, value: snapshot.invoiceSequence },
        update: { value: snapshot.invoiceSequence },
      });

      await tx.user.deleteMany({ where: { id: { not: userId } } });
      for (const row of snapshot.users) {
        const id = String(row.id);
        if (id === userId) {
          await tx.user.update({
            where: { id },
            data: {
              username: String(row.username),
              passwordHash: String(row.passwordHash),
              role: row.role as never,
              isActive: Boolean(row.isActive),
            },
          });
          continue;
        }
        await tx.user.create({
          data: {
            id,
            username: String(row.username),
            passwordHash: String(row.passwordHash),
            role: row.role as never,
            isActive: Boolean(row.isActive),
            createdAt: asDate(row.createdAt),
            updatedAt: asDate(row.updatedAt),
          },
        });
      }

      return {
        accounts: snapshot.accounts.length,
        parties: snapshot.parties.length,
        products: snapshot.products.length,
        vouchers: snapshot.vouchers.length,
        invoices: snapshot.invoices.length,
        users: snapshot.users.length,
      };
    });

    await this.audit.log({
      userId,
      username,
      action: "RESTORE",
      entity: "backup",
      detail: `بازیابی ${result.vouchers} سند و ${result.invoices} فاکتور`,
    });

    return RestoreResultSchema.parse({
      ok: true,
      restoredAt: new Date().toISOString(),
      tables: result,
    });
  }
}
