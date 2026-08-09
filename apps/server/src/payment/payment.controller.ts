import { Body, Controller, Post } from "@nestjs/common";
import { type Voucher } from "@hesabyar/shared";
import { PaymentService } from "./payment.service";

@Controller("payments")
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post("receipt")
  createReceipt(@Body() body: unknown): Promise<Voucher> {
    return this.paymentService.createReceipt(body);
  }

  @Post("payment")
  createPayment(@Body() body: unknown): Promise<Voucher> {
    return this.paymentService.createPayment(body);
  }
}
