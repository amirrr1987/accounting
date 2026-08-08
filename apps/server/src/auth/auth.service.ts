import {
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import {
  LoginResponseSchema,
  LoginSchema,
  MeResponseSchema,
  type LoginInput,
  type LoginResponse,
  type MeResponse,
} from "@hesabyar/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { JwtPayload } from "./jwt-auth.guard";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
  ) {}

  async login(raw: LoginInput): Promise<LoginResponse> {
    const input = LoginSchema.parse(raw);
    const user = await this.prisma.user.findUnique({
      where: { username: input.username },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException("نام کاربری یا رمز عبور نادرست است");
    }
    const ok = await bcrypt.compare(input.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException("نام کاربری یا رمز عبور نادرست است");
    }

    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };
    const accessToken = await this.jwt.signAsync(payload);

    await this.audit.log({
      userId: user.id,
      username: user.username,
      action: "LOGIN",
      entity: "auth",
      detail: "ورود موفق",
    });

    return LoginResponseSchema.parse({
      accessToken,
      user: { id: user.id, username: user.username, role: user.role },
    });
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
    });
  }
}
