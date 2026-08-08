import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from "@nestjs/common";
import {
  CreatePartnerDrawingSchema,
  CreatePartnerSchema,
  UpdatePartnerSchema,
  type CreatePartnerDrawingInput,
  type CreatePartnerInput,
  type OwnershipDashboard,
  type Partner,
  type PartnerBalanceReport,
  type PartnerDrawing,
  type UpdatePartnerInput,
} from "@hesabyar/shared";
import { PartnerService } from "./partner.service";

@Controller("partners")
export class PartnerController {
  constructor(private readonly service: PartnerService) {}

  @Get()
  findAll(): Promise<Partner[]> {
    return this.service.findAll();
  }

  @Get("balances")
  balances(
    @Query("fromJalali") fromJalali: string,
    @Query("toJalali") toJalali: string,
  ): Promise<PartnerBalanceReport> {
    return this.service.balances(fromJalali, toJalali);
  }

  @Get("ownership")
  ownership(): Promise<OwnershipDashboard> {
    return this.service.ownership();
  }

  @Get("drawings")
  findDrawings(): Promise<PartnerDrawing[]> {
    return this.service.findDrawings();
  }

  @Post("drawings")
  createDrawing(
    @Body() body: CreatePartnerDrawingInput,
  ): Promise<PartnerDrawing> {
    return this.service.createDrawing(CreatePartnerDrawingSchema.parse(body));
  }

  @Post()
  create(@Body() body: CreatePartnerInput): Promise<Partner> {
    return this.service.create(CreatePartnerSchema.parse(body));
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() body: UpdatePartnerInput,
  ): Promise<Partner> {
    return this.service.update(id, UpdatePartnerSchema.parse(body));
  }

  @Delete(":id")
  deactivate(@Param("id") id: string): Promise<void> {
    return this.service.deactivate(id);
  }
}
