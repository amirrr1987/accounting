import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import type { UserRole } from "@hesabyar/shared";
import { IS_PUBLIC_KEY } from "./public.decorator";
import { LoginEventService } from "./login-event.service";
import { assertPasswordChangeAllowed } from "./password-change.policy";

export type JwtPayload = {
  sub: string;
  username: string;
  role: UserRole;
  /** شناسه نشست (jti) — برای لاگ ورود/خروج و ابطال */
  jti?: string;
  /** کاربر باید رمز را عوض کند */
  mustChangePassword?: boolean;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    private readonly loginEvents: LoginEventService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: JwtPayload }>();
    const header = request.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new UnauthorizedException("ورود لازم است");
    }
    const token = header.slice("Bearer ".length).trim();
    try {
      const payload = this.jwt.verify<JwtPayload>(token);
      if (payload.jti) {
        const active = await this.loginEvents.isSessionActive(payload.jti);
        if (!active) {
          throw new UnauthorizedException("نشست پایان یافته است؛ دوباره وارد شوید");
        }
      }
      assertPasswordChangeAllowed(
        payload.mustChangePassword,
        request.method,
        request.originalUrl || request.url,
      );
      request.user = payload;
      return true;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      if (err && typeof err === "object" && "getStatus" in err) throw err;
      throw new UnauthorizedException("نشست نامعتبر یا منقضی شده است");
    }
  }
}
