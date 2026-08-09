import { UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { AuthService } from "./auth.service";
import type { PrismaService } from "../prisma/prisma.service";
import type { AuditService } from "../audit/audit.service";
import type { LoginEventService } from "./login-event.service";

describe("AuthService.login", () => {
  const userId = "550e8400-e29b-41d4-a716-446655440099";
  const sessionId = "660e8400-e29b-41d4-a716-446655440099";
  const request = { ip: "127.0.0.1", userAgent: "vitest" };

  const audit = {
    log: jest.fn().mockResolvedValue(undefined),
  } as unknown as AuditService;

  function makeLoginEvents(
    overrides: Partial<LoginEventService> = {},
  ): LoginEventService {
    return {
      isLockedOut: jest.fn().mockResolvedValue(false),
      record: jest.fn().mockResolvedValue({}),
      newSessionId: jest.fn().mockReturnValue(sessionId),
      deviceFingerprint: jest.fn().mockReturnValue("fp"),
      isNewDevice: jest.fn().mockResolvedValue(false),
      countActiveSessions: jest.fn().mockResolvedValue(0),
      countRecentFailures: jest.fn().mockResolvedValue(0),
      countRecentAttempts: jest.fn().mockResolvedValue(0),
      markLogout: jest.fn().mockResolvedValue(true),
      isSessionActive: jest.fn().mockResolvedValue(true),
      findRecent: jest.fn().mockResolvedValue([]),
      ...overrides,
    } as unknown as LoginEventService;
  }

  it("returns token and requires password change for default admin", async () => {
    const hash = await bcrypt.hash("admin", 4);
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: userId,
          username: "admin",
          passwordHash: hash,
          role: "ADMIN",
          isActive: true,
          mustChangePassword: true,
        }),
      },
    } as unknown as PrismaService;

    const jwt = {
      signAsync: jest.fn().mockResolvedValue("test-token"),
    } as unknown as JwtService;

    const loginEvents = makeLoginEvents();
    const service = new AuthService(prisma, jwt, audit, loginEvents);
    const result = await service.login(
      { username: "admin", password: "admin" },
      request,
    );

    expect(result.accessToken).toBe("test-token");
    expect(result.user.mustChangePassword).toBe(true);
    expect(result.sessionId).toBe(sessionId);
    expect(jwt.signAsync).toHaveBeenCalledWith(
      expect.objectContaining({ mustChangePassword: true }),
    );
  });

  it("rejects wrong password and records failure", async () => {
    const hash = await bcrypt.hash("admin", 4);
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: userId,
          username: "admin",
          passwordHash: hash,
          role: "ADMIN",
          isActive: true,
          mustChangePassword: true,
        }),
      },
    } as unknown as PrismaService;

    const jwt = {
      signAsync: jest.fn(),
    } as unknown as JwtService;

    const loginEvents = makeLoginEvents();
    const service = new AuthService(prisma, jwt, audit, loginEvents);
    await expect(
      service.login({ username: "admin", password: "wrong" }, request),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(loginEvents.record).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        failReason: "INVALID_CREDENTIALS",
      }),
    );
  });
});
