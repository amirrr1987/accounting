import { Global, Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { AuditModule } from "../audit/audit.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { LoginEventService } from "./login-event.service";
import { RolesGuard } from "./roles.guard";

@Global()
@Module({
  imports: [
    AuditModule,
    JwtModule.register({
      global: true,
      secret:
        process.env.JWT_SECRET ??
        (process.env.NODE_ENV === "production"
          ? (() => {
              throw new Error(
                "JWT_SECRET must be set in production",
              );
            })()
          : "hesabyar-dev-secret-change-me"),
      signOptions: { expiresIn: "7d" },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    LoginEventService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
  exports: [AuthService, LoginEventService, JwtModule],
})
export class AuthModule {}
