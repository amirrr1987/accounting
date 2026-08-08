import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from "@nestjs/common";
import {
  CreateInvoiceSchema,
  type CreateInvoiceInput,
  type Invoice,
  type InvoiceVoucherPreview,
} from "@hesabyar/shared";
import { InvoiceService } from "./invoice.service";

@Controller("invoices")
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Get()
  findAll(): Promise<Invoice[]> {
    return this.invoiceService.findAll();
  }

  @Post("preview")
  preview(@Body() body: CreateInvoiceInput): Promise<InvoiceVoucherPreview> {
    const parsed = CreateInvoiceSchema.parse(body);
    return this.invoiceService.preview(parsed);
  }

  @Get(":id")
  findOne(@Param("id", ParseUUIDPipe) id: string): Promise<Invoice> {
    return this.invoiceService.findOne(id);
  }

  @Post()
  create(@Body() body: CreateInvoiceInput): Promise<Invoice> {
    const parsed = CreateInvoiceSchema.parse(body);
    return this.invoiceService.create(parsed);
  }

  @Delete(":id")
  softDelete(@Param("id", ParseUUIDPipe) id: string): Promise<Invoice> {
    return this.invoiceService.softDelete(id);
  }
}
