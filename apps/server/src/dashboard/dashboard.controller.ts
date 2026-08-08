import { Controller, Get } from "@nestjs/common";
import type { DashboardSummary } from "@hesabyar/shared";
import { DashboardService } from "./dashboard.service";

@Controller("dashboard")
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  getSummary(): Promise<DashboardSummary> {
    return this.dashboardService.getSummary();
  }
}
