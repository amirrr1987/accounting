import { Module } from "@nestjs/common";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";
import { FiscalYearModule } from "../fiscal-year/fiscal-year.module";
import { ReportModule } from "../report/report.module";
import { PartnerModule } from "../partner/partner.module";

@Module({
  imports: [FiscalYearModule, ReportModule, PartnerModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
