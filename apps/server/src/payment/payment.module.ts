import { Module } from "@nestjs/common";
import { FiscalYearModule } from "../fiscal-year/fiscal-year.module";
import { CheckModule } from "../check/check.module";
import { PaymentController } from "./payment.controller";
import { PaymentService } from "./payment.service";

@Module({
  imports: [FiscalYearModule, CheckModule],
  controllers: [PaymentController],
  providers: [PaymentService],
})
export class PaymentModule {}
