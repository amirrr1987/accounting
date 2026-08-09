import { Controller, Get, Query } from "@nestjs/common";
import {
  type BalanceSheetReport,
  type CashFlowReport,
  type CheckReport,
  type FinancialCharts,
  type InventoryKardexReport,
  type OwnerStatusReport,
  type PartyStatementReport,
  type ProfitLossReport,
  type VatReport,
} from "@hesabyar/shared";
import { ReportService } from "./report.service";

@Controller("reports")
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get("profit-loss")
  profitLoss(@Query() query: unknown): Promise<ProfitLossReport> {
    return this.reportService.profitLoss(query);
  }

  @Get("balance-sheet")
  balanceSheet(@Query() query: unknown): Promise<BalanceSheetReport> {
    return this.reportService.balanceSheet(query);
  }

  @Get("party-statement")
  partyStatement(@Query() query: unknown): Promise<PartyStatementReport> {
    return this.reportService.partyStatement(query);
  }

  @Get("charts")
  charts(@Query() query: unknown): Promise<FinancialCharts> {
    return this.reportService.charts(query);
  }

  @Get("vat")
  vatReport(@Query() query: unknown): Promise<VatReport> {
    return this.reportService.vatReport(query);
  }

  @Get("cash-flow")
  cashFlow(@Query() query: unknown): Promise<CashFlowReport> {
    return this.reportService.cashFlow(query);
  }

  @Get("checks")
  checkReport(@Query() query: unknown): Promise<CheckReport> {
    return this.reportService.checkReport(query);
  }

  @Get("inventory-kardex")
  inventoryKardex(@Query() query: unknown): Promise<InventoryKardexReport> {
    return this.reportService.inventoryKardex(query);
  }

  @Get("owner-status")
  ownerStatus(@Query() query: unknown): Promise<OwnerStatusReport> {
    return this.reportService.ownerStatus(query);
  }
}
