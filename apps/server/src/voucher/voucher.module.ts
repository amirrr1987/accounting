import { Module } from "@nestjs/common";
import { FiscalYearModule } from "../fiscal-year/fiscal-year.module";
import { VoucherController } from "./voucher.controller";
import { VoucherService } from "./voucher.service";

@Module({
  imports: [FiscalYearModule],
  controllers: [VoucherController],
  providers: [VoucherService],
  exports: [VoucherService],
})
export class VoucherModule {}
