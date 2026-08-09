import {
  LoginClientMetaSchema,
  type LoginClientMeta,
} from "@hesabyar/shared";

function isTauriRuntime(): boolean {
  return (
    typeof window !== "undefined" &&
    ("__TAURI_INTERNALS__" in window || "__TAURI__" in window)
  );
}

/** متادیتای سبک کلاینت برای لاگ ورود (بدون MAC) */
export function buildLoginClientMeta(): LoginClientMeta {
  const screen =
    typeof window !== "undefined" && window.screen
      ? `${window.screen.width}x${window.screen.height}`
      : undefined;

  return LoginClientMetaSchema.parse({
    clientType: isTauriRuntime() ? "DESKTOP" : "WEB",
    appVersion: "0.1.0",
    platform:
      typeof navigator !== "undefined"
        ? navigator.platform?.slice(0, 64) || undefined
        : undefined,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone?.slice(0, 64),
    locale:
      typeof navigator !== "undefined"
        ? navigator.language?.slice(0, 32) || undefined
        : undefined,
    screen,
    correlationId: crypto.randomUUID(),
  });
}
