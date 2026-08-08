import { UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { AuthService } from "./auth.service";
import type { PrismaService } from "../prisma/prisma.service";
import type { AuditService } from "../audit/audit.service";

describe("AuthService.login", () => {
  const userId = "550e8400-e29b-41d4-a716-446655440099";

  const audit = {
    log: jest.fn().mockResolvedValue(undefined),
  } as unknown as AuditService;

  it("returns token for valid admin credentials", async () => {
    const hash = await bcrypt.hash("admin", 4);
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: userId,
          username: "admin",
          passwordHash: hash,
          role: "ADMIN",
          isActive: true,
        }),
      },
    } as unknown as PrismaService;

    const jwt = {
      signAsync: jest.fn().mockResolvedValue("test-token"),
    } as unknown as JwtService;

    const service = new AuthService(prisma, jwt, audit);
    const result = await service.login({
      username: "admin",
      password: "admin",
    });

    expect(result.accessToken).toBe("test-token");
    expect(result.user.username).toBe("admin");
    expect(result.user.role).toBe("ADMIN");
  });

  it("rejects wrong password", async () => {
    const hash = await bcrypt.hash("admin", 4);
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: userId,
          username: "admin",
          passwordHash: hash,
          role: "ADMIN",
          isActive: true,
        }),
      },
    } as unknown as PrismaService;

    const jwt = {
      signAsync: jest.fn(),
    } as unknown as JwtService;

    const service = new AuthService(prisma, jwt, audit);
    await expect(
      service.login({ username: "admin", password: "wrong" }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
