import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import {
  CreateVoucherSchema,
  type CreateVoucherInput,
  type Voucher,
} from "@hesabyar/shared";
import { VoucherService } from "./voucher.service";

@Controller("vouchers")
export class VoucherController {
  constructor(private readonly voucherService: VoucherService) {}

  @Get()
  findAll(): Promise<Voucher[]> {
    return this.voucherService.findAll();
  }

  @Get(":id")
  findOne(@Param("id", ParseUUIDPipe) id: string): Promise<Voucher> {
    return this.voucherService.findOne(id);
  }

  @Post()
  create(@Body() body: CreateVoucherInput): Promise<Voucher> {
    const parsed = CreateVoucherSchema.parse(body);
    return this.voucherService.create(parsed);
  }
}
