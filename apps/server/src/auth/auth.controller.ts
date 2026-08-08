import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import {
  LoginSchema,
  type LoginInput,
  type LoginResponse,
  type MeResponse,
} from "@hesabyar/shared";
import { AuthService } from "./auth.service";
import { Public } from "./public.decorator";
import type { JwtPayload } from "./jwt-auth.guard";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("login")
  login(@Body() body: LoginInput): Promise<LoginResponse> {
    const parsed = LoginSchema.parse(body);
    return this.authService.login(parsed);
  }

  @Get("me")
  me(@Req() req: { user?: JwtPayload }): Promise<MeResponse> {
    if (!req.user?.sub) {
      throw new UnauthorizedException("ورود لازم است");
    }
    return this.authService.me(req.user.sub);
  }
}
