import { Controller, Get, Post, Patch, Body, Param } from "@nestjs/common";
import {
  CreateBankAccountSchema,
  type BankAccount,
  type CreateBankAccountInput,
} from "@hesabyar/shared";
import { BankAccountService } from "./bank-account.service";

@Controller("bank-accounts")
export class BankAccountController {
  constructor(private readonly service: BankAccountService) {}

  @Get()
  findAll(): Promise<BankAccount[]> {
    return this.service.findAll();
  }

  @Post()
  create(@Body() body: CreateBankAccountInput): Promise<BankAccount> {
    return this.service.create(CreateBankAccountSchema.parse(body));
  }

  @Patch(":id/deactivate")
  deactivate(@Param("id") id: string): Promise<void> {
    return this.service.deactivate(id);
  }
}
