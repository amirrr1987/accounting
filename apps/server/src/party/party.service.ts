import { Injectable, NotFoundException } from "@nestjs/common";
import {
  CreatePartySchema,
  type CreatePartyInput,
  type Party,
  type PartyKind,
} from "@hesabyar/shared";
import { PrismaService } from "../prisma/prisma.service";
import { toPartyDto } from "./party.mapper";

@Injectable()
export class PartyService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(kind?: PartyKind): Promise<Party[]> {
    const rows = await this.prisma.party.findMany({
      where: kind ? { kind } : undefined,
      orderBy: { name: "asc" },
    });
    return rows.map(toPartyDto);
  }

  async findOne(id: string): Promise<Party> {
    const row = await this.prisma.party.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException("طرف‌حساب یافت نشد");
    }
    return toPartyDto(row);
  }

  async create(raw: CreatePartyInput): Promise<Party> {
    const input = CreatePartySchema.parse(raw);
    const row = await this.prisma.party.create({
      data: {
        kind: input.kind,
        name: input.name,
        phone: input.phone ?? null,
        nationalId: input.nationalId ?? null,
        commissionRate: input.commissionRate ?? null,
        isActive: input.isActive ?? true,
      },
    });
    return toPartyDto(row);
  }

  async update(id: string, raw: CreatePartyInput): Promise<Party> {
    await this.findOne(id);
    const input = CreatePartySchema.parse(raw);
    const row = await this.prisma.party.update({
      where: { id },
      data: {
        kind: input.kind,
        name: input.name,
        phone: input.phone ?? null,
        nationalId: input.nationalId ?? null,
        commissionRate: input.commissionRate ?? null,
        isActive: input.isActive ?? true,
      },
    });
    return toPartyDto(row);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.party.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
