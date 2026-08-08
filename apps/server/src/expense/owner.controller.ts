import { Controller, Get, Post, Body } from "@nestjs/common";
import {
  CreateOwnerDrawingSchema,
  CreateOwnerSchema,
  type CreateOwnerDrawingInput,
  type CreateOwnerInput,
  type Owner,
  type OwnerDrawing,
} from "@hesabyar/shared";
import { OwnerService } from "./owner.service";

@Controller()
export class OwnerController {
  constructor(private readonly service: OwnerService) {}

  @Get("owners")
  findAll(): Promise<Owner[]> {
    return this.service.findAll();
  }

  @Post("owners")
  create(@Body() body: CreateOwnerInput): Promise<Owner> {
    return this.service.create(CreateOwnerSchema.parse(body));
  }

  @Get("owner-drawings")
  findDrawings(): Promise<OwnerDrawing[]> {
    return this.service.findDrawings();
  }

  @Post("owner-drawings")
  createDrawing(
    @Body() body: CreateOwnerDrawingInput,
  ): Promise<OwnerDrawing> {
    return this.service.createDrawing(CreateOwnerDrawingSchema.parse(body));
  }
}
