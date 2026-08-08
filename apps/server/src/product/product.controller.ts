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
} from "@nestjs/common";
import {
  CreateProductSchema,
  type CreateProductInput,
  type Product,
} from "@hesabyar/shared";
import { ProductService } from "./product.service";

@Controller("products")
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  findAll(): Promise<Product[]> {
    return this.productService.findAll();
  }

  @Get(":id")
  findOne(@Param("id", ParseUUIDPipe) id: string): Promise<Product> {
    return this.productService.findOne(id);
  }

  @Post()
  create(@Body() body: CreateProductInput): Promise<Product> {
    const parsed = CreateProductSchema.parse(body);
    return this.productService.create(parsed);
  }

  @Patch(":id")
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: CreateProductInput,
  ): Promise<Product> {
    const parsed = CreateProductSchema.parse(body);
    return this.productService.update(id, parsed);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    await this.productService.remove(id);
  }
}
