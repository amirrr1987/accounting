import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import * as bcrypt from "bcrypt";
import {
  CreateUserSchema,
  UpdateUserSchema,
  UserListSchema,
  UserRecordSchema,
  type UserRecord,
  type UserRole,
} from "@hesabyar/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(): Promise<UserRecord[]> {
    const rows = await this.prisma.user.findMany({
      orderBy: { username: "asc" },
    });
    return UserListSchema.parse(
      rows.map((u) => ({
        id: u.id,
        username: u.username,
        role: u.role,
        isActive: u.isActive,
        mustChangePassword: u.mustChangePassword,
        createdAt: u.createdAt.toISOString(),
      })),
    );
  }

  async create(raw: unknown, actor: string): Promise<UserRecord> {
    const input = CreateUserSchema.parse(raw);
    const existing = await this.prisma.user.findUnique({
      where: { username: input.username },
    });
    if (existing) {
      throw new BadRequestException("نام کاربری تکراری است");
    }
    const passwordHash = await bcrypt.hash(input.password, 10);
    const created = await this.prisma.user.create({
      data: {
        username: input.username,
        passwordHash,
        role: input.role,
        isActive: true,
        mustChangePassword: true,
      },
    });
    await this.audit.log({
      userId: created.id,
      username: actor,
      action: "CREATE",
      entity: "user",
      entityId: created.id,
      detail: input.username,
    });
    return UserRecordSchema.parse({
      id: created.id,
      username: created.username,
      role: created.role,
      isActive: created.isActive,
      mustChangePassword: created.mustChangePassword,
      createdAt: created.createdAt.toISOString(),
    });
  }

  async update(
    id: string,
    raw: unknown,
    actor: string,
  ): Promise<UserRecord> {
    const input = UpdateUserSchema.parse(raw);
    const row = await this.prisma.user.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException("کاربر یافت نشد");
    }
    const data: {
      role?: UserRole;
      isActive?: boolean;
      passwordHash?: string;
      mustChangePassword?: boolean;
    } = {};
    if (input.role !== undefined) data.role = input.role;
    if (input.isActive !== undefined) data.isActive = input.isActive;
    if (input.password) {
      data.passwordHash = await bcrypt.hash(input.password, 10);
      data.mustChangePassword = true;
    }
    const updated = await this.prisma.user.update({ where: { id }, data });
    await this.audit.log({
      username: actor,
      action: "UPDATE",
      entity: "user",
      entityId: id,
      detail: updated.username,
    });
    return UserRecordSchema.parse({
      id: updated.id,
      username: updated.username,
      role: updated.role,
      isActive: updated.isActive,
      mustChangePassword: updated.mustChangePassword,
      createdAt: updated.createdAt.toISOString(),
    });
  }
}
