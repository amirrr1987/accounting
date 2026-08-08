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
  CreateReturnInvoiceSchema,
  type CreateInvoiceInput,
  type CreateReturnInvoiceInput,
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
    return this.invoiceService.preview(CreateInvoiceSchema.parse(body));
  }

  @Post("returns/preview")
  previewReturn(
    @Body() body: CreateReturnInvoiceInput,
  ): Promise<InvoiceVoucherPreview> {
    return this.invoiceService.previewReturn(
      CreateReturnInvoiceSchema.parse(body),
    );
  }

  @Get(":id")
  findOne(@Param("id", ParseUUIDPipe) id: string): Promise<Invoice> {
    return this.invoiceService.findOne(id);
  }

  @Post()
  create(@Body() body: CreateInvoiceInput): Promise<Invoice> {
    return this.invoiceService.create(CreateInvoiceSchema.parse(body));
  }

  @Post("returns")
  createReturn(@Body() body: CreateReturnInvoiceInput): Promise<Invoice> {
    return this.invoiceService.createReturn(
      CreateReturnInvoiceSchema.parse(body),
    );
  }

  @Delete(":id")
  softDelete(@Param("id", ParseUUIDPipe) id: string): Promise<Invoice> {
    return this.invoiceService.softDelete(id);
  }
}
