/** Origins مجاز برای دسکتاپ Tauri + Vite dev */
const EXPLICIT_ORIGINS = new Set([
  "http://localhost:1420",
  "http://127.0.0.1:1420",
  "tauri://localhost",
  "http://tauri.localhost",
  "https://tauri.localhost",
]);

/** localhost / 127.0.0.1 روی هر پورت (فقط dev محلی) */
const LOCAL_DEV_ORIGIN =
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

export function isCorsOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true;
  if (EXPLICIT_ORIGINS.has(origin)) return true;
  return LOCAL_DEV_ORIGIN.test(origin);
}

export const corsOptions = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ): void => {
    callback(null, isCorsOriginAllowed(origin));
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS", "HEAD"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"],
};
