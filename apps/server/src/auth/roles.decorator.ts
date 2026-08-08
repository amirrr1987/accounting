import { SetMetadata } from "@nestjs/common";
import type { UserRole } from "@hesabyar/shared";

export const ROLES_KEY = "roles";

/** محدودیت نقش — فقط برای درخواست‌های POST/PATCH/DELETE */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
