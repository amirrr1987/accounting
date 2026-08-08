import { Module } from "@nestjs/common";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";
import { FiscalYearModule } from "../fiscal-year/fiscal-year.module";
import { ReportModule } from "../report/report.module";

@Module({
  imports: [FiscalYearModule, ReportModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
