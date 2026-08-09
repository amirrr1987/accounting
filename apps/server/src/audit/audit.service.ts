import { Injectable } from "@nestjs/common";
import {
  AuditLogListSchema,
  AuditLogQuerySchema,
  type AuditAction,
  type AuditLog,
} from "@hesabyar/shared";
import { PrismaService } from "../prisma/prisma.service";

type LogInput = {
  userId?: string | null;
  username: string;
  action: AuditAction;
  entity: string;
  entityId?: string | null;
  detail?: string | null;
};

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: LogInput): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        username: input.username,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        detail: input.detail ?? null,
      },
    });
  }

  async findRecent(query: unknown): Promise<AuditLog[]> {
    const { limit } = AuditLogQuerySchema.parse(query);
    const rows = await this.prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return AuditLogListSchema.parse(
      rows.map((r) => ({
        id: r.id,
        userId: r.userId,
        username: r.username,
        action: r.action,
        entity: r.entity,
        entityId: r.entityId,
        detail: r.detail,
        createdAt: r.createdAt.toISOString(),
      })),
    );
  }
}
