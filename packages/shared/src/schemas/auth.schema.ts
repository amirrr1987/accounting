import { z } from "zod";
import { LoginClientMetaSchema } from "./login-event.schema";

export const UserRoleSchema = z.enum(["ADMIN", "ACCOUNTANT", "VIEWER"]);
export type UserRole = z.infer<typeof UserRoleSchema>;

const UsernameSchema = z
  .string()
  .trim()
  .min(1, "نام کاربری الزامی است")
  .max(64, "نام کاربری حداکثر ۶۴ کاراکتر است")
  .regex(
    /^[a-zA-Z0-9._@-]+$/,
    "نام کاربری فقط حروف، عدد و . _ @ - را می‌پذیرد",
  );

const LoginPasswordSchema = z
  .string()
  .min(1, "رمز عبور الزامی است")
  .max(128, "رمز عبور حداکثر ۱۲۸ کاراکتر است");

const UserPasswordSchema = z
  .string()
  .min(4, "رمز عبور حداقل ۴ کاراکتر است")
  .max(128, "رمز عبور حداکثر ۱۲۸ کاراکتر است");

export const LoginSchema = z.object({
  username: UsernameSchema,
  password: LoginPasswordSchema,
  client: LoginClientMetaSchema.optional(),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const AuthUserSchema = z.object({
  id: z.string().uuid(),
  username: z.string().min(1).max(64),
  role: UserRoleSchema,
});
export type AuthUser = z.infer<typeof AuthUserSchema>;

export const LoginResponseSchema = z.object({
  accessToken: z.string().min(1),
  user: AuthUserSchema,
  sessionId: z.string().uuid(),
  isNewDevice: z.boolean(),
  activeSessionCount: z.number().int().min(1),
});
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

export const LogoutResponseSchema = z.object({
  ok: z.literal(true),
});
export type LogoutResponse = z.infer<typeof LogoutResponseSchema>;

export const MeResponseSchema = AuthUserSchema;
export type MeResponse = z.infer<typeof MeResponseSchema>;

export const CreateUserSchema = z.object({
  username: UsernameSchema,
  password: UserPasswordSchema,
  role: UserRoleSchema.default("ACCOUNTANT"),
});
export type CreateUserInput = z.infer<typeof CreateUserSchema>;

export const UpdateUserSchema = z
  .object({
    role: UserRoleSchema.optional(),
    isActive: z.boolean().optional(),
    password: UserPasswordSchema.optional(),
  })
  .refine(
    (v) =>
      v.role !== undefined ||
      v.isActive !== undefined ||
      v.password !== undefined,
    { message: "حداقل یک فیلد برای به‌روزرسانی لازم است" },
  );
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;

export const UserRecordSchema = z.object({
  id: z.string().uuid(),
  username: z.string().min(1).max(64),
  role: UserRoleSchema,
  isActive: z.boolean(),
  createdAt: z.string().datetime().optional(),
});
export type UserRecord = z.infer<typeof UserRecordSchema>;

export const UserListSchema = z.array(UserRecordSchema);
export type UserList = z.infer<typeof UserListSchema>;

/** کاربر پیش‌فرض برای نصب تازه */
export const DEFAULT_ADMIN_USERNAME = "admin";
export const DEFAULT_ADMIN_PASSWORD = "admin";

export function canWrite(role: UserRole): boolean {
  return role === "ADMIN" || role === "ACCOUNTANT";
}

export function isAdmin(role: UserRole): boolean {
  return role === "ADMIN";
}

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "مدیر",
  ACCOUNTANT: "حسابدار",
  VIEWER: "مشاهده‌گر",
};
