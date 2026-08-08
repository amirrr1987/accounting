import { Controller, Get, Query } from "@nestjs/common";
import { Roles } from "../auth/roles.decorator";
import type { AuditLog, AuditLogQuery } from "@hesabyar/shared";
import { AuditService } from "./audit.service";

@Controller("audit-logs")
@Roles("ADMIN")
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  findRecent(@Query() query: AuditLogQuery): Promise<AuditLog[]> {
    return this.auditService.findRecent(query);
  }
}
