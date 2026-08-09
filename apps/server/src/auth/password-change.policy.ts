import { ForbiddenException } from "@nestjs/common";

/** مسیرهای مجاز وقتی mustChangePassword=true */
export function isPasswordChangeAllowedPath(
  method: string,
  path: string,
): boolean {
  const normalized = path.split("?")[0]?.replace(/\/+$/, "") ?? "";
  if (method === "POST" && normalized.endsWith("/auth/change-password")) {
    return true;
  }
  if (method === "POST" && normalized.endsWith("/auth/logout")) {
    return true;
  }
  if (method === "GET" && normalized.endsWith("/auth/me")) {
    return true;
  }
  return false;
}

export function assertPasswordChangeAllowed(
  mustChangePassword: boolean | undefined,
  method: string,
  path: string,
): void {
  if (!mustChangePassword) return;
  if (isPasswordChangeAllowedPath(method, path)) return;
  throw new ForbiddenException(
    "برای ادامه کار باید ابتدا رمز عبور را تغییر دهید",
  );
}
