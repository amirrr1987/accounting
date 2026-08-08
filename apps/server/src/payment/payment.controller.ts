import { Body, Controller, Post } from "@nestjs/common";
import {
  type CreatePaymentInput,
  type CreateReceiptInput,
  type Voucher,
} from "@hesabyar/shared";
import { PaymentService } from "./payment.service";

@Controller("payments")
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post("receipt")
  createReceipt(@Body() body: CreateReceiptInput): Promise<Voucher> {
    return this.paymentService.createReceipt(body);
  }

  @Post("payment")
  createPayment(@Body() body: CreatePaymentInput): Promise<Voucher> {
    return this.paymentService.createPayment(body);
  }
}
