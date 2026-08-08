import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import {
  CreatePartySchema,
  type CreatePartyInput,
  type Party,
} from "@hesabyar/shared";
import { PartyService } from "./party.service";

@Controller("parties")
export class PartyController {
  constructor(private readonly partyService: PartyService) {}

  @Get()
  findAll(@Query("kind") kind?: string): Promise<Party[]> {
    return this.partyService.findAll(kind);
  }

  @Get(":id")
  findOne(@Param("id", ParseUUIDPipe) id: string): Promise<Party> {
    return this.partyService.findOne(id);
  }

  @Post()
  create(@Body() body: CreatePartyInput): Promise<Party> {
    const parsed = CreatePartySchema.parse(body);
    return this.partyService.create(parsed);
  }

  @Patch(":id")
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: CreatePartyInput,
  ): Promise<Party> {
    const parsed = CreatePartySchema.parse(body);
    return this.partyService.update(id, parsed);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    await this.partyService.remove(id);
  }
}
