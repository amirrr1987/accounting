import { Controller, Get, Query } from "@nestjs/common";
import {
  TrialBalanceQuerySchema,
  type TrialBalanceQuery,
  type TrialBalanceReport,
} from "@hesabyar/shared";
import { TrialBalanceService } from "./trial-balance.service";

@Controller("trial-balance")
export class TrialBalanceController {
  constructor(private readonly trialBalanceService: TrialBalanceService) {}

  @Get()
  getReport(
    @Query("asOfJalali") asOfJalali: string,
  ): Promise<TrialBalanceReport> {
    const query: TrialBalanceQuery = TrialBalanceQuerySchema.parse({
      asOfJalali,
    });
    return this.trialBalanceService.getReport(query);
  }
}
