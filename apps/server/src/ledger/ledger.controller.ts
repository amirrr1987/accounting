import { Controller, Get, Query } from "@nestjs/common";
import {
  LedgerQuerySchema,
  type LedgerQuery,
  type LedgerReport,
} from "@hesabyar/shared";
import { LedgerService } from "./ledger.service";

@Controller("ledger")
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  @Get()
  getReport(
    @Query("accountId") accountId: string,
    @Query("fromJalali") fromJalali?: string,
    @Query("toJalali") toJalali?: string,
  ): Promise<LedgerReport> {
    const query: LedgerQuery = LedgerQuerySchema.parse({
      accountId,
      fromJalali: fromJalali || undefined,
      toJalali: toJalali || undefined,
    });
    return this.ledgerService.getReport(query);
  }
}
