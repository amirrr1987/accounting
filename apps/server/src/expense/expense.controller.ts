import { Controller, Get, Post, Body, Query } from "@nestjs/common";
import {
  CreateExpenseSchema,
  ExpenseSummaryQuerySchema,
  type Expense,
  type ExpenseCategory,
  type ExpenseSummary,
} from "@hesabyar/shared";
import { ExpenseService } from "./expense.service";

@Controller()
export class ExpenseController {
  constructor(private readonly service: ExpenseService) {}

  @Get("expense-categories")
  findCategories(): Promise<ExpenseCategory[]> {
    return this.service.findCategories();
  }

  @Get("expenses")
  findAll(): Promise<Expense[]> {
    return this.service.findAll();
  }

  @Get("expenses/summary")
  summary(
    @Query("fromJalali") fromJalali: string,
    @Query("toJalali") toJalali: string,
  ): Promise<ExpenseSummary> {
    return this.service.summary(
      ExpenseSummaryQuerySchema.parse({ fromJalali, toJalali }),
    );
  }

  @Post("expenses")
  create(@Body() body: unknown): Promise<Expense> {
    return this.service.create(CreateExpenseSchema.parse(body));
  }
}
