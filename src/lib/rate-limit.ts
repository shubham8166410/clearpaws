// In-memory rate limiter — 5 requests per IP per 24 hours.
//
// LIMITATION: This resets on serverless cold starts. For production,
// migrate to Upstash Redis or Vercel KV.
// TODO: Replace with Redis-backed rate limiter before high-traffic launch.

export const RATE_LIMIT_MAX = 5;
const WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

interface RateLimitEntry {
  count: number;
  resetAt: number; // epoch ms
}

// Module-level store — persists across requests within the same process
const store = new Map<string, RateLimitEntry>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

// key should be a namespaced string, e.g. `ratelimit:timeline:${ip}`
// Both /api/generate-timeline and /api/generate-outbound-timeline use the same
// key prefix so they share the same 5/day bucket per IP.
export function checkRateLimit(key: string): RateLimitResult {
  if (!key) {
    return { allowed: false, remaining: 0, resetAt: new Date(Date.now() + WINDOW_MS) };
  }

  const now = Date.now();
  const existing = store.get(key);

  if (!existing || now >= existing.resetAt) {
    // First request or window has expired — start fresh
    const resetAt = now + WINDOW_MS;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1, resetAt: new Date(resetAt) };
  }

  if (existing.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0, resetAt: new Date(existing.resetAt) };
  }

  existing.count += 1;
  const remaining = RATE_LIMIT_MAX - existing.count;
  return { allowed: true, remaining, resetAt: new Date(existing.resetAt) };
}

// Exported only for unit tests — do not call from application code
export function resetRateLimitForTesting(): void {
  store.clear();
}
