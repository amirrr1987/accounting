import { Controller, Get, Post, Body, Req } from "@nestjs/common";
import type { Request } from "express";
import { Roles } from "../auth/roles.decorator";
import type { JwtPayload } from "../auth/jwt-auth.guard";
import type { BackupSnapshot, RestoreResult } from "@hesabyar/shared";
import { BackupService } from "./backup.service";

type AuthedRequest = Request & { user?: JwtPayload };

@Controller("backup")
@Roles("ADMIN")
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Get("export")
  export(@Req() req: AuthedRequest): Promise<BackupSnapshot> {
    return this.backupService.exportSnapshot(req.user!.username);
  }

  @Post("restore")
  restore(
    @Body() body: unknown,
    @Req() req: AuthedRequest,
  ): Promise<RestoreResult> {
    return this.backupService.restoreSnapshot(
      body,
      req.user!.username,
      req.user!.sub,
    );
  }
}
