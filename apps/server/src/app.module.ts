import { Module } from "@nestjs/common";
import { HealthController } from "./health/health.controller";
import { HealthService } from "./health/health.service";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { AuditModule } from "./audit/audit.module";
import { AccountModule } from "./account/account.module";
import { VoucherModule } from "./voucher/voucher.module";
import { LedgerModule } from "./ledger/ledger.module";
import { TrialBalanceModule } from "./trial-balance/trial-balance.module";
import { PartyModule } from "./party/party.module";
import { ProductModule } from "./product/product.module";
import { InvoiceModule } from "./invoice/invoice.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { FiscalYearModule } from "./fiscal-year/fiscal-year.module";
import { PaymentModule } from "./payment/payment.module";
import { ReportModule } from "./report/report.module";
import { BackupModule } from "./backup/backup.module";
import { UserModule } from "./user/user.module";
import { UnitModule } from "./unit/unit.module";
import { WeightAdjustmentModule } from "./weight-adjustment/weight-adjustment.module";
import { BankAccountModule } from "./bank-account/bank-account.module";

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    AuthModule,
    AccountModule,
    VoucherModule,
    LedgerModule,
    TrialBalanceModule,
    PartyModule,
    ProductModule,
    UnitModule,
    InvoiceModule,
    FiscalYearModule,
    PaymentModule,
    ReportModule,
    DashboardModule,
    BackupModule,
    UserModule,
    WeightAdjustmentModule,
    BankAccountModule,
  ],
  controllers: [HealthController],
  providers: [HealthService],
})
export class AppModule {}
