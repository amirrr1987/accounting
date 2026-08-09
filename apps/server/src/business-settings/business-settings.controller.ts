import { Body, Controller, Get, Patch } from "@nestjs/common";
import {
  UpdateBusinessSettingsSchema,
  type BusinessSettings,
} from "@hesabyar/shared";
import { BusinessSettingsService } from "./business-settings.service";

@Controller("settings/business")
export class BusinessSettingsController {
  constructor(private readonly service: BusinessSettingsService) {}

  @Get()
  get(): Promise<BusinessSettings> {
    return this.service.get();
  }

  @Patch()
  update(@Body() body: unknown): Promise<BusinessSettings> {
    return this.service.update(UpdateBusinessSettingsSchema.parse(body));
  }
}
