import { Injectable } from "@nestjs/common";
import {
  BusinessSettingsSchema,
  UpdateBusinessSettingsSchema,
  type BusinessSettings,
  type UpdateBusinessSettingsInput,
} from "@hesabyar/shared";
import { PrismaService } from "../prisma/prisma.service";

const SETTINGS_ID = "default";

@Injectable()
export class BusinessSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(): Promise<BusinessSettings> {
    const row = await this.ensureRow();
    return this.toDto(row);
  }

  async update(raw: UpdateBusinessSettingsInput): Promise<BusinessSettings> {
    const input = UpdateBusinessSettingsSchema.parse(raw);
    const row = await this.prisma.businessSettings.update({
      where: { id: SETTINGS_ID },
      data: {
        businessName: input.businessName.trim(),
        businessType: input.businessType,
        businessTypeCustom:
          input.businessType === "OTHER"
            ? input.businessTypeCustom?.trim() ?? null
            : null,
        legalName: input.legalName?.trim() || null,
        nationalId: input.nationalId?.trim() || null,
        economicCode: input.economicCode?.trim() || null,
        phone: input.phone?.trim() || null,
        mobile: input.mobile?.trim() || null,
        address: input.address?.trim() || null,
        city: input.city?.trim() || null,
        postalCode: input.postalCode?.trim() || null,
        description: input.description?.trim() || null,
        displayUnit: input.displayUnit,
        inputUnit: input.inputUnit,
        moneyDisplayConfigured: input.moneyDisplayConfigured,
      },
    });
    return this.toDto(row);
  }

  private async ensureRow() {
    return this.prisma.businessSettings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID },
      update: {},
    });
  }

  private toDto(row: {
    businessName: string;
    businessType: BusinessSettings["businessType"];
    businessTypeCustom: string | null;
    legalName: string | null;
    nationalId: string | null;
    economicCode: string | null;
    phone: string | null;
    mobile: string | null;
    address: string | null;
    city: string | null;
    postalCode: string | null;
    description: string | null;
    displayUnit: BusinessSettings["displayUnit"];
    inputUnit: BusinessSettings["inputUnit"];
    moneyDisplayConfigured: boolean;
  }): BusinessSettings {
    return BusinessSettingsSchema.parse({
      businessName: row.businessName,
      businessType: row.businessType,
      businessTypeCustom: row.businessTypeCustom,
      legalName: row.legalName,
      nationalId: row.nationalId,
      economicCode: row.economicCode,
      phone: row.phone,
      mobile: row.mobile,
      address: row.address,
      city: row.city,
      postalCode: row.postalCode,
      description: row.description,
      displayUnit: row.displayUnit,
      inputUnit: row.inputUnit,
      moneyDisplayConfigured: row.moneyDisplayConfigured,
    });
  }
}
