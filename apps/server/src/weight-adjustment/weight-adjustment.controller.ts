import { Controller, Get, Post, Body } from "@nestjs/common";
import {
  CreateWeightAdjustmentSchema,
  type CreateWeightAdjustmentInput,
  type WeightAdjustment,
} from "@hesabyar/shared";
import { WeightAdjustmentService } from "./weight-adjustment.service";

@Controller("weight-adjustments")
export class WeightAdjustmentController {
  constructor(private readonly service: WeightAdjustmentService) {}

  @Get()
  findAll(): Promise<WeightAdjustment[]> {
    return this.service.findAll();
  }

  @Post()
  create(@Body() body: CreateWeightAdjustmentInput): Promise<WeightAdjustment> {
    return this.service.create(CreateWeightAdjustmentSchema.parse(body));
  }
}
