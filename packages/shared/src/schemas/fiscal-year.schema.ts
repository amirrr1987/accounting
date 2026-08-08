import { z } from "zod";

export const FiscalYearSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(32),
  startJalali: z
    .string()
    .regex(/^\d{4}\/\d{2}\/\d{2}$/, "فرمت تاریخ باید YYYY/MM/DD شمسی باشد"),
  endJalali: z
    .string()
    .regex(/^\d{4}\/\d{2}\/\d{2}$/, "فرمت تاریخ باید YYYY/MM/DD شمسی باشد"),
  isClosed: z.boolean(),
  isActive: z.boolean(),
  closedThroughJalali: z.string().nullable().optional(),
});
export type FiscalYear = z.infer<typeof FiscalYearSchema>;

export const FiscalYearListSchema = z.array(FiscalYearSchema);
export type FiscalYearList = z.infer<typeof FiscalYearListSchema>;

export const CreateFiscalYearSchema = z.object({
  title: z.string().min(1).max(32),
  startJalali: z
    .string()
    .regex(/^\d{4}\/\d{2}\/\d{2}$/, "فرمت تاریخ باید YYYY/MM/DD شمسی باشد"),
  endJalali: z
    .string()
    .regex(/^\d{4}\/\d{2}\/\d{2}$/, "فرمت تاریخ باید YYYY/MM/DD شمسی باشد"),
});
export type CreateFiscalYearInput = z.infer<typeof CreateFiscalYearSchema>;

export const CloseFiscalYearSchema = z.object({
  throughJalali: z
    .string()
    .regex(/^\d{4}\/\d{2}\/\d{2}$/, "فرمت تاریخ باید YYYY/MM/DD شمسی باشد")
    .optional(),
  closeYear: z.boolean().optional().default(false),
});
export type CloseFiscalYearInput = z.infer<typeof CloseFiscalYearSchema>;
