import { z } from "zod";

/** حداکثر تلاش ناموفق در پنجره زمانی قبل از قفل موقت */
export const LOGIN_MAX_FAILURES = 5;
/** پنجره شمارش تلاش‌های ناموفق (دقیقه) */
export const LOGIN_FAILURE_WINDOW_MINUTES = 15;
/** مدت قفل موقت پس از عبور از سقف تلاش (دقیقه) */
export const LOGIN_LOCKOUT_MINUTES = 15;

export const LoginClientTypeSchema = z.enum(["DESKTOP", "WEB", "UNKNOWN"]);
export type LoginClientType = z.infer<typeof LoginClientTypeSchema>;

export const LoginFailReasonSchema = z.enum([
  "INVALID_CREDENTIALS",
  "USER_NOT_FOUND",
  "USER_INACTIVE",
  "LOCKED_OUT",
  "VALIDATION_ERROR",
]);
export type LoginFailReason = z.infer<typeof LoginFailReasonSchema>;

export const LoginRiskFlagSchema = z.enum([
  "MANY_FAILURES",
  "NEW_DEVICE",
  "CONCURRENT_SESSIONS",
  "RAPID_ATTEMPTS",
]);
export type LoginRiskFlag = z.infer<typeof LoginRiskFlagSchema>;

const screenRegex = /^\d{2,5}x\d{2,5}$/;

/** متادیتای سبک کلاینت — بدون MAC (در وب/سرور در دسترس نیست) */
export const LoginClientMetaSchema = z.object({
  clientType: LoginClientTypeSchema.default("UNKNOWN"),
  appVersion: z.string().trim().min(1).max(32).optional(),
  platform: z.string().trim().min(1).max(64).optional(),
  timezone: z.string().trim().min(1).max(64).optional(),
  locale: z.string().trim().min(1).max(32).optional(),
  screen: z
    .string()
    .trim()
    .regex(screenRegex, "فرمت صفحه باید مثل 1920x1080 باشد")
    .optional(),
  correlationId: z.string().uuid().optional(),
});
export type LoginClientMeta = z.infer<typeof LoginClientMetaSchema>;

export const LoginEventSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid().nullable(),
  username: z.string(),
  success: z.boolean(),
  failReason: LoginFailReasonSchema.nullable(),
  ip: z.string().nullable(),
  userAgent: z.string().nullable(),
  clientType: LoginClientTypeSchema,
  appVersion: z.string().nullable(),
  sessionId: z.string().uuid().nullable(),
  correlationId: z.string().nullable(),
  timezone: z.string().nullable(),
  locale: z.string().nullable(),
  platform: z.string().nullable(),
  screen: z.string().nullable(),
  deviceFingerprint: z.string().nullable(),
  country: z.string().nullable(),
  city: z.string().nullable(),
  isNewDevice: z.boolean(),
  riskFlags: z.array(LoginRiskFlagSchema),
  activeSessionCount: z.number().int().nullable(),
  createdAt: z.string().datetime(),
  loggedOutAt: z.string().datetime().nullable(),
});
export type LoginEvent = z.infer<typeof LoginEventSchema>;

export const LoginEventListSchema = z.array(LoginEventSchema);
export type LoginEventList = z.infer<typeof LoginEventListSchema>;

export const LoginEventQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  username: z.string().trim().min(1).max(64).optional(),
  success: z
    .union([z.boolean(), z.enum(["true", "false"])])
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined;
      if (typeof v === "boolean") return v;
      return v === "true";
    }),
});
export type LoginEventQuery = z.infer<typeof LoginEventQuerySchema>;

export const LOGIN_FAIL_REASON_LABELS: Record<LoginFailReason, string> = {
  INVALID_CREDENTIALS: "نام کاربری یا رمز نادرست",
  USER_NOT_FOUND: "کاربر یافت نشد",
  USER_INACTIVE: "کاربر غیرفعال",
  LOCKED_OUT: "قفل موقت به‌خاطر تلاش زیاد",
  VALIDATION_ERROR: "خطای اعتبارسنجی",
};

export const LOGIN_CLIENT_TYPE_LABELS: Record<LoginClientType, string> = {
  DESKTOP: "دسکتاپ",
  WEB: "وب",
  UNKNOWN: "نامشخص",
};

export const LOGIN_RISK_FLAG_LABELS: Record<LoginRiskFlag, string> = {
  MANY_FAILURES: "تلاش ناموفق زیاد",
  NEW_DEVICE: "دستگاه جدید",
  CONCURRENT_SESSIONS: "نشست هم‌زمان",
  RAPID_ATTEMPTS: "تلاش‌های متوالی سریع",
};
