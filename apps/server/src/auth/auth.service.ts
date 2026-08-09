import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import {
  ChangePasswordSchema,
  LOGIN_MAX_FAILURES,
  LoginResponseSchema,
  LoginSchema,
  LogoutResponseSchema,
  MeResponseSchema,
  type ChangePasswordInput,
  type ChangePasswordResponse,
  type LoginInput,
  type LoginResponse,
  type LoginRiskFlag,
  type LogoutResponse,
  type MeResponse,
} from "@hesabyar/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { JwtPayload } from "./jwt-auth.guard";
import {
  LoginEventService,
  type RequestMeta,
} from "./login-event.service";

const GENERIC_AUTH_ERROR = "نام کاربری یا رمز عبور نادرست است";
const LOCKOUT_ERROR =
  "تعداد تلاش ناموفق زیاد است. ۱۵ دقیقه دیگر دوباره تلاش کنید.";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
    private readonly loginEvents: LoginEventService,
  ) {}

  async login(
    raw: LoginInput,
    request: RequestMeta,
  ): Promise<LoginResponse> {
    const input = LoginSchema.parse(raw);
    const username = input.username;
    const client = input.client;

    if (await this.loginEvents.isLockedOut(username)) {
      await this.loginEvents.record({
        username,
        success: false,
        failReason: "LOCKED_OUT",
        client,
        request,
      });
      throw new HttpException(LOCKOUT_ERROR, HttpStatus.TOO_MANY_REQUESTS);
    }

    const user = await this.prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      await this.recordFailure(username, null, "USER_NOT_FOUND", client, request);
      throw new UnauthorizedException(GENERIC_AUTH_ERROR);
    }

    if (!user.isActive) {
      await this.recordFailure(
        username,
        user.id,
        "USER_INACTIVE",
        client,
        request,
      );
      throw new UnauthorizedException(GENERIC_AUTH_ERROR);
    }

    const ok = await bcrypt.compare(input.password, user.passwordHash);
    if (!ok) {
      await this.recordFailure(
        username,
        user.id,
        "INVALID_CREDENTIALS",
        client,
        request,
      );
      throw new UnauthorizedException(GENERIC_AUTH_ERROR);
    }

    const sessionId = this.loginEvents.newSessionId();
    return this.issueSession(user, sessionId, client, request, {
      recordLoginEvent: true,
      auditLogin: true,
    });
  }

  async changePassword(
    userId: string,
    sessionId: string | undefined,
    raw: ChangePasswordInput,
    request: RequestMeta,
  ): Promise<ChangePasswordResponse> {
    const input = ChangePasswordSchema.parse(raw);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException("کاربر یافت نشد");
    }

    const ok = await bcrypt.compare(input.currentPassword, user.passwordHash);
    if (!ok) {
      throw new BadRequestException("رمز فعلی نادرست است");
    }

    const passwordHash = await bcrypt.hash(input.newPassword, 10);
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        mustChangePassword: false,
      },
    });

    if (sessionId) {
      await this.loginEvents.markLogout(sessionId);
    }
    const newSessionId = this.loginEvents.newSessionId();

    await this.audit.log({
      userId: updated.id,
      username: updated.username,
      action: "UPDATE",
      entity: "auth",
      entityId: updated.id,
      detail: "تغییر رمز عبور",
    });

    return this.issueSession(updated, newSessionId, undefined, request, {
      recordLoginEvent: true,
      auditLogin: false,
      priorActiveOverride: 0,
    });
  }

  async logout(sessionId: string | undefined, username: string, userId: string): Promise<LogoutResponse> {
    if (sessionId) {
      const marked = await this.loginEvents.markLogout(sessionId);
      if (marked) {
        await this.audit.log({
          userId,
          username,
          action: "LOGOUT",
          entity: "auth",
          entityId: sessionId,
          detail: "خروج از نشست",
        });
      }
    }
    return LogoutResponseSchema.parse({ ok: true });
  }

  async me(userId: string): Promise<MeResponse> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException("کاربر یافت نشد");
    }
    return MeResponseSchema.parse({
      id: user.id,
      username: user.username,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    });
  }

  isSessionActive(sessionId: string): Promise<boolean> {
    return this.loginEvents.isSessionActive(sessionId);
  }

  private async issueSession(
    user: {
      id: string;
      username: string;
      role: "ADMIN" | "ACCOUNTANT" | "VIEWER";
      mustChangePassword: boolean;
    },
    sessionId: string,
    client: LoginInput["client"] | undefined,
    request: RequestMeta,
    opts: {
      recordLoginEvent: boolean;
      auditLogin: boolean;
      priorActiveOverride?: number;
    },
  ): Promise<LoginResponse> {
    const clientType = client?.clientType ?? "UNKNOWN";
    const fingerprint = this.loginEvents.deviceFingerprint(
      clientType,
      client?.platform,
      request.userAgent,
    );
    const isNewDevice = await this.loginEvents.isNewDevice(
      user.id,
      fingerprint,
    );
    const priorActive =
      opts.priorActiveOverride ??
      (await this.loginEvents.countActiveSessions(user.id));
    const recentFailures = await this.loginEvents.countRecentFailures(
      user.username,
    );
    const rapidAttempts = await this.loginEvents.countRecentAttempts(
      user.username,
      60_000,
    );

    const riskFlags: LoginRiskFlag[] = [];
    if (recentFailures >= Math.max(1, LOGIN_MAX_FAILURES - 2)) {
      riskFlags.push("MANY_FAILURES");
    }
    if (isNewDevice) riskFlags.push("NEW_DEVICE");
    if (priorActive >= 1) riskFlags.push("CONCURRENT_SESSIONS");
    if (rapidAttempts >= 3) riskFlags.push("RAPID_ATTEMPTS");

    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      jti: sessionId,
      mustChangePassword: user.mustChangePassword,
    };
    const accessToken = await this.jwt.signAsync(payload);
    const activeSessionCount = priorActive + 1;

    if (opts.recordLoginEvent) {
      await this.loginEvents.record({
        username: user.username,
        userId: user.id,
        success: true,
        client,
        request,
        sessionId,
        isNewDevice,
        riskFlags,
        activeSessionCount,
      });
    }

    if (opts.auditLogin) {
      const detailParts = [
        "ورود موفق",
        user.mustChangePassword ? "نیازبهتغییررمز" : null,
        request.ip ? `IP:${request.ip}` : null,
        clientType !== "UNKNOWN" ? clientType : null,
        isNewDevice ? "دستگاه‌جدید" : null,
      ].filter(Boolean);

      await this.audit.log({
        userId: user.id,
        username: user.username,
        action: "LOGIN",
        entity: "auth",
        entityId: sessionId,
        detail: detailParts.join(" · "),
      });
    }

    return LoginResponseSchema.parse({
      accessToken,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
      sessionId,
      isNewDevice,
      activeSessionCount,
    });
  }

  private async recordFailure(
    username: string,
    userId: string | null,
    failReason: "INVALID_CREDENTIALS" | "USER_NOT_FOUND" | "USER_INACTIVE",
    client: LoginInput["client"],
    request: RequestMeta,
  ): Promise<void> {
    const recentFailures = await this.loginEvents.countRecentFailures(username);
    const rapidAttempts = await this.loginEvents.countRecentAttempts(
      username,
      60_000,
    );
    const riskFlags: LoginRiskFlag[] = [];
    if (recentFailures + 1 >= Math.max(1, LOGIN_MAX_FAILURES - 2)) {
      riskFlags.push("MANY_FAILURES");
    }
    if (rapidAttempts + 1 >= 3) riskFlags.push("RAPID_ATTEMPTS");

    await this.loginEvents.record({
      username,
      userId,
      success: false,
      failReason,
      client,
      request,
      riskFlags,
    });
  }
}
