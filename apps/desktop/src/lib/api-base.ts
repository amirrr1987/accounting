/** پورت پیش‌فرض API — از 3000 فاصله دارد تا با اپ‌های دیگر تداخل نکند */
export const DEFAULT_API_PORT = 3100;

/**
 * آدرس پایه API:
 * - dev + مرورگر: proxy هم‌مبدأ (/api)
 * - موبایل/LAN/build: همان hostname با پورت backend
 * - Tauri/بدون window: 127.0.0.1
 */
export function resolveApiBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_BASE_URL;
  if (fromEnv) return fromEnv;

  if (typeof window !== "undefined") {
    const { protocol, hostname, origin } = window.location;

    // Tauri / asset — مستقیم به localhost backend
    if (protocol === "tauri:" || protocol === "file:") {
      return `http://127.0.0.1:${DEFAULT_API_PORT}`;
    }

    // Vite dev: proxy → بدون CORS (موبایل Android روی LAN هم کار می‌کند)
    if (import.meta.env.DEV) {
      return `${origin}/api`;
    }

    // build در مرورger (مثلاً Android): همان IP ماشین + پورت API
    return `${protocol}//${hostname}:${DEFAULT_API_PORT}`;
  }

  return `http://127.0.0.1:${DEFAULT_API_PORT}`;
}
