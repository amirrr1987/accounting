import { Module } from "@nestjs/common";
import { FiscalYearModule } from "../fiscal-year/fiscal-year.module";
import { PaymentController } from "./payment.controller";
import { PaymentService } from "./payment.service";

@Module({
  imports: [FiscalYearModule],
  controllers: [PaymentController],
  providers: [PaymentService],
})
export class PaymentModule {}
