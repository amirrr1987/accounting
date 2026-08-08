import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import {
  CreateAccountSchema,
  UpdateAccountSchema,
  type Account,
  type AccountTreeNode,
  type CreateAccountInput,
  type UpdateAccountInput,
} from "@hesabyar/shared";
import { AccountService } from "./account.service";

@Controller("accounts")
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Get()
  findAll(@Query("search") search?: string): Promise<Account[]> {
    return this.accountService.findAll(search);
  }

  @Get("tree")
  findTree(@Query("search") search?: string): Promise<AccountTreeNode[]> {
    return this.accountService.findTree(search);
  }

  @Get(":id")
  findOne(@Param("id", ParseUUIDPipe) id: string): Promise<Account> {
    return this.accountService.findOne(id);
  }

  @Post()
  create(@Body() body: CreateAccountInput): Promise<Account> {
    const parsed = CreateAccountSchema.parse(body);
    return this.accountService.create(parsed);
  }

  @Patch(":id")
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: UpdateAccountInput,
  ): Promise<Account> {
    const parsed = UpdateAccountSchema.parse(body);
    return this.accountService.update(id, parsed);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    await this.accountService.remove(id);
  }
}
