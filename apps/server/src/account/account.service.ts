import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  CreateAccountSchema,
  UpdateAccountSchema,
  type Account,
  type AccountTreeNode,
  type CreateAccountInput,
  type UpdateAccountInput,
} from "@hesabyar/shared";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { buildAccountTree, toAccountDto } from "./account.mapper";

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "P2002"
  );
}

@Injectable()
export class AccountService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(search?: string): Promise<Account[]> {
    const where: Prisma.AccountWhereInput = search?.trim()
      ? {
          OR: [
            { code: { contains: search.trim(), mode: "insensitive" } },
            { name: { contains: search.trim(), mode: "insensitive" } },
          ],
        }
      : {};

    const rows = await this.prisma.account.findMany({
      where,
      orderBy: { code: "asc" },
    });
    return rows.map(toAccountDto);
  }

  async findTree(search?: string): Promise<AccountTreeNode[]> {
    // برای حفظ سلسله‌مراتب، همه حساب‌ها را می‌گیریم و بعد فیلتر درختی اعمال می‌کنیم
    const all = await this.findAll();
    if (!search?.trim()) {
      return buildAccountTree(all);
    }

    const q = search.trim().toLowerCase();
    const matchedIds = new Set(
      all
        .filter(
          (a) =>
            a.code.toLowerCase().includes(q) ||
            a.name.toLowerCase().includes(q),
        )
        .map((a) => a.id),
    );

    const keep = new Set<string>();
    const byId = new Map(all.map((a) => [a.id, a]));

    for (const id of matchedIds) {
      let current: Account | undefined = byId.get(id);
      while (current) {
        keep.add(current.id);
        current = current.parentId
          ? byId.get(current.parentId)
          : undefined;
      }
    }

    return buildAccountTree(all.filter((a) => keep.has(a.id)));
  }

  async findOne(id: string): Promise<Account> {
    const row = await this.prisma.account.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException("حساب یافت نشد");
    }
    return toAccountDto(row);
  }

  async create(raw: CreateAccountInput): Promise<Account> {
    const input = CreateAccountSchema.parse(raw);

    if (input.parentId) {
      const parent = await this.prisma.account.findUnique({
        where: { id: input.parentId },
      });
      if (!parent) {
        throw new BadRequestException("حساب والد یافت نشد");
      }
      if (parent.type !== input.type) {
        throw new BadRequestException(
          "نوع حساب فرزند باید با نوع حساب والد یکسان باشد",
        );
      }
    } else if (input.level !== "GROUP") {
      throw new BadRequestException("فقط حساب گروه می‌تواند بدون والد باشد");
    }

    try {
      const row = await this.prisma.account.create({
        data: {
          code: input.code,
          name: input.name,
          type: input.type,
          nature: input.nature,
          level: input.level,
          parentId: input.parentId ?? null,
          isActive: input.isActive ?? true,
        },
      });
      return toAccountDto(row);
    } catch (error: unknown) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException("کد حساب تکراری است");
      }
      throw error;
    }
  }

  async update(id: string, raw: UpdateAccountInput): Promise<Account> {
    await this.findOne(id);
    const input = UpdateAccountSchema.parse(raw);

    if (input.parentId === id) {
      throw new BadRequestException("حساب نمی‌تواند والد خودش باشد");
    }

    if (input.parentId) {
      const parent = await this.prisma.account.findUnique({
        where: { id: input.parentId },
      });
      if (!parent) {
        throw new BadRequestException("حساب والد یافت نشد");
      }
    }

    try {
      const row = await this.prisma.account.update({
        where: { id },
        data: {
          ...(input.code !== undefined ? { code: input.code } : {}),
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.type !== undefined ? { type: input.type } : {}),
          ...(input.nature !== undefined ? { nature: input.nature } : {}),
          ...(input.level !== undefined ? { level: input.level } : {}),
          ...(input.parentId !== undefined
            ? { parentId: input.parentId }
            : {}),
          ...(input.isActive !== undefined
            ? { isActive: input.isActive }
            : {}),
        },
      });
      return toAccountDto(row);
    } catch (error: unknown) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException("کد حساب تکراری است");
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);

    const childCount = await this.prisma.account.count({
      where: { parentId: id },
    });
    if (childCount > 0) {
      throw new ConflictException(
        "حذف حساب دارای زیرمجموعه مجاز نیست",
      );
    }

    // یکپارچگی ارجاعی با اسناد حسابداری
    const lineCount = await this.prisma.voucherLine.count({
      where: { accountId: id },
    });
    if (lineCount > 0) {
      throw new ConflictException(
        "حذف حساب دارای سند حسابداری مجاز نیست",
      );
    }

    await this.prisma.account.delete({ where: { id } });
  }
}
