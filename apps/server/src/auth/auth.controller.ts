import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";
import {
  ChangePasswordSchema,
  LoginEventQuerySchema,
  LoginSchema,
  type ChangePasswordResponse,
  type LoginEvent,
  type LoginEventQuery,
  type LoginResponse,
  type LogoutResponse,
  type MeResponse,
} from "@hesabyar/shared";
import { AuthService } from "./auth.service";
import { LoginEventService } from "./login-event.service";
import { Public } from "./public.decorator";
import { Roles } from "./roles.decorator";
import type { JwtPayload } from "./jwt-auth.guard";
import { extractClientIp, extractUserAgent } from "./request-meta";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly loginEvents: LoginEventService,
  ) {}

  @Public()
  @Post("login")
  login(
    @Body() body: unknown,
    @Req() req: Request,
  ): Promise<LoginResponse> {
    const parsed = LoginSchema.parse(body);
    return this.authService.login(parsed, {
      ip: extractClientIp(req),
      userAgent: extractUserAgent(req),
    });
  }

  @Post("change-password")
  changePassword(
    @Body() body: unknown,
    @Req() req: Request & { user?: JwtPayload },
  ): Promise<ChangePasswordResponse> {
    if (!req.user?.sub) {
      throw new UnauthorizedException("ورود لازم است");
    }
    const parsed = ChangePasswordSchema.parse(body);
    return this.authService.changePassword(
      req.user.sub,
      req.user.jti,
      parsed,
      {
        ip: extractClientIp(req),
        userAgent: extractUserAgent(req),
      },
    );
  }

  @Post("logout")
  logout(
    @Req() req: { user?: JwtPayload },
  ): Promise<LogoutResponse> {
    if (!req.user?.sub || !req.user.username) {
      throw new UnauthorizedException("ورود لازم است");
    }
    return this.authService.logout(
      req.user.jti,
      req.user.username,
      req.user.sub,
    );
  }

  @Get("me")
  me(@Req() req: { user?: JwtPayload }): Promise<MeResponse> {
    if (!req.user?.sub) {
      throw new UnauthorizedException("ورود لازم است");
    }
    return this.authService.me(req.user.sub);
  }

  @Get("login-events")
  @Roles("ADMIN")
  loginEventsList(@Query() query: LoginEventQuery): Promise<LoginEvent[]> {
    const parsed = LoginEventQuerySchema.parse(query);
    return this.loginEvents.findRecent(parsed);
  }
}
