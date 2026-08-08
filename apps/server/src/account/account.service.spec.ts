import { ConflictException } from "@nestjs/common";
import { AccountService } from "./account.service";
import type { PrismaService } from "../prisma/prisma.service";

describe("AccountService.remove", () => {
  const account = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    code: "11101",
    name: "صندوق",
    type: "ASSET" as const,
    nature: "DEBIT" as const,
    level: "DETAIL" as const,
    parentId: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  function createService(overrides: {
    childCount?: number;
    lineCount?: number;
  }): AccountService {
    const prisma = {
      account: {
        findUnique: jest.fn().mockResolvedValue(account),
        count: jest.fn().mockResolvedValue(overrides.childCount ?? 0),
        delete: jest.fn().mockResolvedValue(account),
      },
      voucherLine: {
        count: jest.fn().mockResolvedValue(overrides.lineCount ?? 0),
      },
    } as unknown as PrismaService;

    return new AccountService(prisma);
  }

  it("blocks delete when journal lines exist", async () => {
    const service = createService({ lineCount: 2 });
    await expect(service.remove(account.id)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it("blocks delete when children exist", async () => {
    const service = createService({ childCount: 1 });
    await expect(service.remove(account.id)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it("deletes when leaf and unused", async () => {
    const service = createService({});
    await expect(service.remove(account.id)).resolves.toBeUndefined();
  });
});
