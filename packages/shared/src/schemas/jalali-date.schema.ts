import { z } from "zod";
import { isValidJalaliDateString } from "../lib/jalali";

/** رشته تاریخ شمسی کسب‌وکار: YYYY/MM/DD با اعتبار تقویمی */
export const JalaliDateStringSchema = z
  .string()
  .regex(/^\d{4}\/\d{2}\/\d{2}$/, "فرمت تاریخ باید YYYY/MM/DD شمسی باشد")
  .refine(isValidJalaliDateString, "تاریخ شمسی نامعتبر است");

export type JalaliDateString = z.infer<typeof JalaliDateStringSchema>;
