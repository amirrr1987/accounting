import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
} from "@nestjs/common";
import type { Request } from "express";
import { Roles } from "../auth/roles.decorator";
import type { JwtPayload } from "../auth/jwt-auth.guard";
import type {
  CreateUserInput,
  UpdateUserInput,
  UserRecord,
} from "@hesabyar/shared";
import { UserService } from "./user.service";

type AuthedRequest = Request & { user?: JwtPayload };

@Controller("users")
@Roles("ADMIN")
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  findAll(): Promise<UserRecord[]> {
    return this.userService.findAll();
  }

  @Post()
  create(
    @Body() body: CreateUserInput,
    @Req() req: AuthedRequest,
  ): Promise<UserRecord> {
    return this.userService.create(body, req.user!.username);
  }

  @Patch(":id")
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: UpdateUserInput,
    @Req() req: AuthedRequest,
  ): Promise<UserRecord> {
    return this.userService.update(id, body, req.user!.username);
  }
}
