import type { Party as PrismaParty } from "@prisma/client";
import { PartySchema, type Party } from "@hesabyar/shared";

export function toPartyDto(row: PrismaParty): Party {
  return PartySchema.parse({
    id: row.id,
    kind: row.kind,
    name: row.name,
    phone: row.phone,
    nationalId: row.nationalId,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
  });
}
