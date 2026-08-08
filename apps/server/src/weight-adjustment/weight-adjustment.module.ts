import { Module } from "@nestjs/common";
import { FiscalYearModule } from "../fiscal-year/fiscal-year.module";
import { WeightAdjustmentController } from "./weight-adjustment.controller";
import { WeightAdjustmentService } from "./weight-adjustment.service";

@Module({
  imports: [FiscalYearModule],
  controllers: [WeightAdjustmentController],
  providers: [WeightAdjustmentService],
})
export class WeightAdjustmentModule {}
