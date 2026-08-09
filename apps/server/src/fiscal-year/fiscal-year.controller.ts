import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import { type FiscalYear } from "@hesabyar/shared";
import { Roles } from "../auth/roles.decorator";
import { FiscalYearService } from "./fiscal-year.service";

@Controller("fiscal-years")
export class FiscalYearController {
  constructor(private readonly fiscalYearService: FiscalYearService) {}

  @Get()
  findAll(): Promise<FiscalYear[]> {
    return this.fiscalYearService.findAll();
  }

  @Get("active")
  getActive(): Promise<FiscalYear | null> {
    return this.fiscalYearService.getActive();
  }

  @Post()
  @Roles("ADMIN")
  create(@Body() body: unknown): Promise<FiscalYear> {
    return this.fiscalYearService.create(body);
  }

  @Post(":id/activate")
  @Roles("ADMIN")
  activate(@Param("id", ParseUUIDPipe) id: string): Promise<FiscalYear> {
    return this.fiscalYearService.activate(id);
  }

  @Post(":id/close")
  @Roles("ADMIN")
  close(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ): Promise<FiscalYear> {
    return this.fiscalYearService.close(id, body);
  }

  @Post(":id/reopen")
  @Roles("ADMIN")
  reopen(@Param("id", ParseUUIDPipe) id: string): Promise<FiscalYear> {
    return this.fiscalYearService.reopen(id);
  }
}
