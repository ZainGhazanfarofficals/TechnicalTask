import { ApiError } from "./errors";

// Fixed-window in-memory limiter. Per-instance only; swap for Redis if you scale horizontally.
const hits = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    if (hits.size > 10_000) for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
    return;
  }
  if (++entry.count > limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    throw new ApiError(429, "RATE_LIMITED", "Too many attempts. Try again later.", { retryAfter });
  }
}

export const resetRateLimit = (key: string) => void hits.delete(key);

export const clientIp = (req: Request) =>
  req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
