import { Injectable } from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import {
  LOGIN_FAILURE_WINDOW_MINUTES,
  LOGIN_LOCKOUT_MINUTES,
  LOGIN_MAX_FAILURES,
  LoginEventListSchema,
  LoginEventQuerySchema,
  LoginFailReasonSchema,
  LoginRiskFlagSchema,
  type LoginClientMeta,
  type LoginClientType,
  type LoginEvent,
  type LoginEventQuery,
  type LoginFailReason,
  type LoginRiskFlag,
} from "@hesabyar/shared";
import type { LoginClientType as PrismaLoginClientType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export type RequestMeta = {
  ip: string | null;
  userAgent: string | null;
};

export type RecordLoginInput = {
  username: string;
  userId?: string | null;
  success: boolean;
  failReason?: LoginFailReason | null;
  client?: LoginClientMeta;
  request: RequestMeta;
  sessionId?: string | null;
  isNewDevice?: boolean;
  riskFlags?: LoginRiskFlag[];
  activeSessionCount?: number | null;
};

@Injectable()
export class LoginEventService {
  constructor(private readonly prisma: PrismaService) {}

  deviceFingerprint(
    clientType: LoginClientType,
    platform: string | undefined,
    userAgent: string | null,
  ): string {
    const raw = `${clientType}|${platform ?? ""}|${(userAgent ?? "").slice(0, 160)}`;
    return createHash("sha256").update(raw).digest("hex").slice(0, 32);
  }

  newSessionId(): string {
    return randomUUID();
  }

  async countRecentFailures(username: string): Promise<number> {
    const since = new Date(
      Date.now() - LOGIN_FAILURE_WINDOW_MINUTES * 60_000,
    );
    return this.prisma.loginEvent.count({
      where: {
        username,
        success: false,
        createdAt: { gte: since },
      },
    });
  }

  async isLockedOut(username: string): Promise<boolean> {
    const since = new Date(Date.now() - LOGIN_LOCKOUT_MINUTES * 60_000);
    const failures = await this.prisma.loginEvent.count({
      where: {
        username,
        success: false,
        createdAt: { gte: since },
      },
    });
    return failures >= LOGIN_MAX_FAILURES;
  }

  async isNewDevice(
    userId: string,
    fingerprint: string,
  ): Promise<boolean> {
    const prior = await this.prisma.loginEvent.findFirst({
      where: {
        userId,
        success: true,
        deviceFingerprint: fingerprint,
      },
      select: { id: true },
    });
    return !prior;
  }

  async countActiveSessions(userId: string): Promise<number> {
    return this.prisma.loginEvent.count({
      where: {
        userId,
        success: true,
        sessionId: { not: null },
        loggedOutAt: null,
      },
    });
  }

  async countRecentAttempts(username: string, windowMs: number): Promise<number> {
    const since = new Date(Date.now() - windowMs);
    return this.prisma.loginEvent.count({
      where: {
        username,
        createdAt: { gte: since },
      },
    });
  }

  async record(input: RecordLoginInput): Promise<LoginEvent> {
    const client = input.client;
    const clientType = (client?.clientType ?? "UNKNOWN") as PrismaLoginClientType;
    const fingerprint = this.deviceFingerprint(
      clientType,
      client?.platform,
      input.request.userAgent,
    );
    const riskFlags = (input.riskFlags ?? []).map((f) =>
      LoginRiskFlagSchema.parse(f),
    );
    const failReason = input.failReason
      ? LoginFailReasonSchema.parse(input.failReason)
      : null;

    const row = await this.prisma.loginEvent.create({
      data: {
        userId: input.userId ?? null,
        username: input.username,
        success: input.success,
        failReason,
        ip: input.request.ip,
        userAgent: input.request.userAgent,
        clientType,
        appVersion: client?.appVersion ?? null,
        sessionId: input.sessionId ?? null,
        correlationId: client?.correlationId ?? null,
        timezone: client?.timezone ?? null,
        locale: client?.locale ?? null,
        platform: client?.platform ?? null,
        screen: client?.screen ?? null,
        deviceFingerprint: fingerprint,
        isNewDevice: input.isNewDevice ?? false,
        riskFlags,
        activeSessionCount: input.activeSessionCount ?? null,
      },
    });

    return this.toDto(row);
  }

  async markLogout(sessionId: string): Promise<boolean> {
    const existing = await this.prisma.loginEvent.findUnique({
      where: { sessionId },
    });
    if (!existing || !existing.success || existing.loggedOutAt) {
      return false;
    }
    await this.prisma.loginEvent.update({
      where: { sessionId },
      data: { loggedOutAt: new Date() },
    });
    return true;
  }

  async isSessionActive(sessionId: string): Promise<boolean> {
    const row = await this.prisma.loginEvent.findUnique({
      where: { sessionId },
      select: { success: true, loggedOutAt: true },
    });
    if (!row) {
      // توکن‌های قدیمی بدون session ثبت‌شده — تا انقضا مجاز
      return true;
    }
    return row.success && row.loggedOutAt === null;
  }

  async findRecent(query: LoginEventQuery): Promise<LoginEvent[]> {
    const parsed = LoginEventQuerySchema.parse(query);
    const rows = await this.prisma.loginEvent.findMany({
      where: {
        ...(parsed.username ? { username: parsed.username } : {}),
        ...(parsed.success === undefined ? {} : { success: parsed.success }),
      },
      orderBy: { createdAt: "desc" },
      take: parsed.limit,
    });
    return LoginEventListSchema.parse(rows.map((r) => this.toDto(r)));
  }

  private toDto(row: {
    id: string;
    userId: string | null;
    username: string;
    success: boolean;
    failReason: string | null;
    ip: string | null;
    userAgent: string | null;
    clientType: string;
    appVersion: string | null;
    sessionId: string | null;
    correlationId: string | null;
    timezone: string | null;
    locale: string | null;
    platform: string | null;
    screen: string | null;
    deviceFingerprint: string | null;
    country: string | null;
    city: string | null;
    isNewDevice: boolean;
    riskFlags: string[];
    activeSessionCount: number | null;
    createdAt: Date;
    loggedOutAt: Date | null;
  }): LoginEvent {
    const riskFlags = row.riskFlags
      .map((f) => LoginRiskFlagSchema.safeParse(f))
      .filter((r) => r.success)
      .map((r) => r.data);

    return {
      id: row.id,
      userId: row.userId,
      username: row.username,
      success: row.success,
      failReason: row.failReason
        ? LoginFailReasonSchema.parse(row.failReason)
        : null,
      ip: row.ip,
      userAgent: row.userAgent,
      clientType: row.clientType as LoginClientType,
      appVersion: row.appVersion,
      sessionId: row.sessionId,
      correlationId: row.correlationId,
      timezone: row.timezone,
      locale: row.locale,
      platform: row.platform,
      screen: row.screen,
      deviceFingerprint: row.deviceFingerprint,
      country: row.country,
      city: row.city,
      isNewDevice: row.isNewDevice,
      riskFlags,
      activeSessionCount: row.activeSessionCount,
      createdAt: row.createdAt.toISOString(),
      loggedOutAt: row.loggedOutAt?.toISOString() ?? null,
    };
  }
}
