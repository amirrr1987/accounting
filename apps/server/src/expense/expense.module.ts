import { Module } from "@nestjs/common";
import { FiscalYearModule } from "../fiscal-year/fiscal-year.module";
import { ExpenseController } from "./expense.controller";
import { OwnerController } from "./owner.controller";
import { ExpenseService } from "./expense.service";
import { OwnerService } from "./owner.service";

@Module({
  imports: [FiscalYearModule],
  controllers: [ExpenseController, OwnerController],
  providers: [ExpenseService, OwnerService],
})
export class ExpenseModule {}
