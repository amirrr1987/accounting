import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
} from "@nestjs/common";
import {
  CreateCheckSchema,
  CheckQuerySchema,
  UpdateCheckStatusSchema,
  type Check,
  type CheckQuery,
  type CheckSummary,
  type CreateCheckInput,
  type UpdateCheckStatusInput,
} from "@hesabyar/shared";
import { CheckService } from "./check.service";

@Controller("checks")
export class CheckController {
  constructor(private readonly service: CheckService) {}

  @Get()
  findAll(@Query() query: CheckQuery): Promise<Check[]> {
    return this.service.findAll(CheckQuerySchema.parse(query));
  }

  @Get("summary")
  summary(): Promise<CheckSummary> {
    return this.service.summary();
  }

  @Get(":id")
  findOne(@Param("id") id: string): Promise<Check> {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() body: CreateCheckInput): Promise<Check> {
    return this.service.create(CreateCheckSchema.parse(body));
  }

  @Patch(":id/status")
  updateStatus(
    @Param("id") id: string,
    @Body() body: UpdateCheckStatusInput,
  ): Promise<Check> {
    return this.service.updateStatus(id, UpdateCheckStatusSchema.parse(body));
  }
}
