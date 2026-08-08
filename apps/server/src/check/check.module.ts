import { Module } from "@nestjs/common";
import { FiscalYearModule } from "../fiscal-year/fiscal-year.module";
import { CheckController } from "./check.controller";
import { CheckService } from "./check.service";

@Module({
  imports: [FiscalYearModule],
  controllers: [CheckController],
  providers: [CheckService],
  exports: [CheckService],
})
export class CheckModule {}
