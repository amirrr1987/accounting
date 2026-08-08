import { z } from "zod";

/** پاسخ سلامت سرور — برای پینگ دسکتاپ ↔ بک‌اند */
export const HealthResponseSchema = z.object({
  status: z.literal("ok"),
  version: z.string().min(1),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;
