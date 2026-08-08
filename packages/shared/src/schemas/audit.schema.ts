import { z } from "zod";

export const AuditActionSchema = z.enum([
  "CREATE",
  "UPDATE",
  "DELETE",
  "LOGIN",
  "EXPORT",
  "RESTORE",
]);
export type AuditAction = z.infer<typeof AuditActionSchema>;

export const AuditLogSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid().nullable(),
  username: z.string(),
  action: AuditActionSchema,
  entity: z.string(),
  entityId: z.string().nullable(),
  detail: z.string().nullable(),
  createdAt: z.string().datetime(),
});
export type AuditLog = z.infer<typeof AuditLogSchema>;

export const AuditLogListSchema = z.array(AuditLogSchema);
export type AuditLogList = z.infer<typeof AuditLogListSchema>;

export const AuditLogQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
});
export type AuditLogQuery = z.infer<typeof AuditLogQuerySchema>;

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  CREATE: "ایجاد",
  UPDATE: "ویرایش",
  DELETE: "حذف",
  LOGIN: "ورود",
  EXPORT: "خروجی پشتیبان",
  RESTORE: "بازیابی پشتیبان",
};
