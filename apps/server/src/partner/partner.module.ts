import { Module } from "@nestjs/common";
import { FiscalYearModule } from "../fiscal-year/fiscal-year.module";
import { ReportModule } from "../report/report.module";
import { PartnerController } from "./partner.controller";
import { PartnerService } from "./partner.service";

@Module({
  imports: [FiscalYearModule, ReportModule],
  controllers: [PartnerController],
  providers: [PartnerService],
  exports: [PartnerService],
})
export class PartnerModule {}
