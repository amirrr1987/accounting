import { Module } from "@nestjs/common";
import { TrialBalanceController } from "./trial-balance.controller";
import { TrialBalanceService } from "./trial-balance.service";

@Module({
  controllers: [TrialBalanceController],
  providers: [TrialBalanceService],
  exports: [TrialBalanceService],
})
export class TrialBalanceModule {}
