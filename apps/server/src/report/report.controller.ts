import { Controller, Get, Query } from "@nestjs/common";
import {
  type BalanceSheetReport,
  type FinancialCharts,
  type PartyStatementQuery,
  type PartyStatementReport,
  type ProfitLossReport,
  type ReportAsOfQuery,
  type ReportRangeQuery,
  type VatReport,
} from "@hesabyar/shared";
import { ReportService } from "./report.service";

@Controller("reports")
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get("profit-loss")
  profitLoss(@Query() query: ReportRangeQuery): Promise<ProfitLossReport> {
    return this.reportService.profitLoss(query);
  }

  @Get("balance-sheet")
  balanceSheet(@Query() query: ReportAsOfQuery): Promise<BalanceSheetReport> {
    return this.reportService.balanceSheet(query);
  }

  @Get("party-statement")
  partyStatement(
    @Query() query: PartyStatementQuery,
  ): Promise<PartyStatementReport> {
    return this.reportService.partyStatement(query);
  }

  @Get("charts")
  charts(
    @Query("fromJalali") fromJalali: string,
    @Query("toJalali") toJalali: string,
  ): Promise<FinancialCharts> {
    return this.reportService.charts(fromJalali, toJalali);
  }

  @Get("vat")
  vatReport(@Query() query: ReportRangeQuery): Promise<VatReport> {
    return this.reportService.vatReport(query);
  }
}
