import { Injectable, NotFoundException } from "@nestjs/common";
import {
  BankAccountSchema,
  CreateBankAccountSchema,
  movementDelta,
  type BankAccount,
  type CreateBankAccountInput,
} from "@hesabyar/shared";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class BankAccountService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<BankAccount[]> {
    const rows = await this.prisma.bankAccount.findMany({
      include: { coaAccount: true },
      orderBy: { name: "asc" },
    });
    return Promise.all(rows.map((row) => this.toDto(row)));
  }

  async create(raw: CreateBankAccountInput): Promise<BankAccount> {
    const input = CreateBankAccountSchema.parse(raw);
    const parent = await this.prisma.account.findUnique({
      where: { code: "111" },
    });
    if (!parent) {
      throw new NotFoundException("حساب معین بانک (۱۱۱) یافت نشد");
    }

    const code = await this.nextBankCoaCode(parent.id);
    const accountName = `${input.bankName} — ${input.name}`;

    const created = await this.prisma.$transaction(async (tx) => {
      const coaAccount = await tx.account.create({
        data: {
          code,
          name: accountName,
          type: "ASSET",
          nature: "DEBIT",
          level: "DETAIL",
          parentId: parent.id,
          isActive: input.isActive ?? true,
        },
      });

      return tx.bankAccount.create({
        data: {
          name: input.name,
          bankName: input.bankName,
          accountNumber: input.accountNumber ?? null,
          sheba: input.sheba ?? null,
          coaAccountId: coaAccount.id,
          isActive: input.isActive ?? true,
        },
        include: { coaAccount: true },
      });
    });

    return this.toDto(created);
  }

  async deactivate(id: string): Promise<void> {
    const row = await this.prisma.bankAccount.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException("حساب بانکی یافت نشد");
    }
    await this.prisma.$transaction([
      this.prisma.bankAccount.update({
        where: { id },
        data: { isActive: false },
      }),
      this.prisma.account.update({
        where: { id: row.coaAccountId },
        data: { isActive: false },
      }),
    ]);
  }

  private async nextBankCoaCode(parentId: string): Promise<string> {
    const children = await this.prisma.account.findMany({
      where: { parentId },
      select: { code: true },
    });
    const maxNum = children.reduce((max, row) => {
      const n = Number.parseInt(row.code, 10);
      return Number.isFinite(n) && n > max ? n : max;
    }, 11100);
    return String(maxNum + 1);
  }

  private async accountBalance(accountId: string): Promise<bigint> {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
    });
    if (!account) return 0n;

    const lines = await this.prisma.voucherLine.findMany({
      where: { accountId },
      select: { debit: true, credit: true },
    });

    return lines.reduce(
      (acc, line) =>
        acc + movementDelta(account.nature, line.debit, line.credit),
      0n,
    );
  }

  private async toDto(row: {
    id: string;
    name: string;
    bankName: string;
    accountNumber: string | null;
    sheba: string | null;
    coaAccountId: string;
    isActive: boolean;
    coaAccount: { code: string; name: string };
  }): Promise<BankAccount> {
    const balance = await this.accountBalance(row.coaAccountId);
    return BankAccountSchema.parse({
      id: row.id,
      name: row.name,
      bankName: row.bankName,
      accountNumber: row.accountNumber,
      sheba: row.sheba,
      coaAccountId: row.coaAccountId,
      coaAccountCode: row.coaAccount.code,
      coaAccountName: row.coaAccount.name,
      currentBalance: balance.toString(),
      isActive: row.isActive,
    });
  }
}
