import type { Request } from "express";

export function extractClientIp(req: Request): string | null {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim().length > 0) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    const first = forwarded[0].split(",")[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  const ip = req.socket.remoteAddress ?? req.ip;
  return ip ? ip.slice(0, 64) : null;
}

export function extractUserAgent(req: Request): string | null {
  const ua = req.headers["user-agent"];
  if (typeof ua !== "string" || ua.trim().length === 0) return null;
  return ua.trim().slice(0, 512);
}
