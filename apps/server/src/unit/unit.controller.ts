import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from "@nestjs/common";
import {
  CreateUnitSchema,
  type CreateUnitInput,
  type UnitOfMeasure,
} from "@hesabyar/shared";
import { UnitService } from "./unit.service";

@Controller("units")
export class UnitController {
  constructor(private readonly unitService: UnitService) {}

  @Get()
  findAll(): Promise<UnitOfMeasure[]> {
    return this.unitService.findAll();
  }

  @Get(":id")
  findOne(@Param("id", ParseUUIDPipe) id: string): Promise<UnitOfMeasure> {
    return this.unitService.findOne(id);
  }

  @Post()
  create(@Body() body: CreateUnitInput): Promise<UnitOfMeasure> {
    return this.unitService.create(CreateUnitSchema.parse(body));
  }

  @Patch(":id")
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: CreateUnitInput,
  ): Promise<UnitOfMeasure> {
    return this.unitService.update(id, CreateUnitSchema.parse(body));
  }
}
