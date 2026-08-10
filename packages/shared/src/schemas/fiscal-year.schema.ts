import { z } from "zod";
import { JalaliDateStringSchema } from "./jalali-date.schema";

export const FiscalYearSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(32),
  startJalali: JalaliDateStringSchema,
  endJalali: JalaliDateStringSchema,
  isClosed: z.boolean(),
  isActive: z.boolean(),
  closedThroughJalali: JalaliDateStringSchema.nullable().optional(),
});
export type FiscalYear = z.infer<typeof FiscalYearSchema>;

export const FiscalYearListSchema = z.array(FiscalYearSchema);
export type FiscalYearList = z.infer<typeof FiscalYearListSchema>;

export const CreateFiscalYearSchema = z.object({
  title: z.string().min(1).max(32),
  startJalali: JalaliDateStringSchema,
  endJalali: JalaliDateStringSchema,
});
export type CreateFiscalYearInput = z.infer<typeof CreateFiscalYearSchema>;

export const CloseFiscalYearSchema = z.object({
  throughJalali: JalaliDateStringSchema.optional(),
  closeYear: z.boolean().optional().default(false),
});
export type CloseFiscalYearInput = z.infer<typeof CloseFiscalYearSchema>;
