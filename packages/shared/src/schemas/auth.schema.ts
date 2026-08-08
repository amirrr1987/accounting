import { z } from "zod";

export const UserRoleSchema = z.enum(["ADMIN", "ACCOUNTANT", "VIEWER"]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const LoginSchema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(1).max(128),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const AuthUserSchema = z.object({
  id: z.string().uuid(),
  username: z.string(),
  role: UserRoleSchema,
});
export type AuthUser = z.infer<typeof AuthUserSchema>;

export const LoginResponseSchema = z.object({
  accessToken: z.string().min(1),
  user: AuthUserSchema,
});
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

export const MeResponseSchema = AuthUserSchema;
export type MeResponse = z.infer<typeof MeResponseSchema>;

export const CreateUserSchema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(4).max(128),
  role: UserRoleSchema.default("ACCOUNTANT"),
});
export type CreateUserInput = z.infer<typeof CreateUserSchema>;

export const UpdateUserSchema = z.object({
  role: UserRoleSchema.optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(4).max(128).optional(),
});
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;

export const UserRecordSchema = z.object({
  id: z.string().uuid(),
  username: z.string(),
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
