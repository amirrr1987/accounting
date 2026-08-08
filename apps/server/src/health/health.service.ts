import { Injectable } from "@nestjs/common";
import {
  HealthResponseSchema,
  type HealthResponse,
} from "@hesabyar/shared";

@Injectable()
export class HealthService {
  getHealth(): HealthResponse {
    return HealthResponseSchema.parse({
      status: "ok",
      version: "0.1.0",
    });
  }
}
