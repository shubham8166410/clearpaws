import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  checkApiKeyRateLimit,
  resetApiRateLimitForTesting,
  API_KEY_RATE_LIMIT_MAX,
} from "@/lib/api-rate-limit";

describe("checkApiKeyRateLimit", () => {
  beforeEach(() => {
    resetApiRateLimitForTesting();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns success:true and remaining:99 on first call", () => {
    const result = checkApiKeyRateLimit("key-id-1");
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(API_KEY_RATE_LIMIT_MAX - 1);
  });

  it("remaining decrements correctly on subsequent calls", () => {
    checkApiKeyRateLimit("key-id-1"); // 99
    const second = checkApiKeyRateLimit("key-id-1"); // 98
    expect(second.success).toBe(true);
    expect(second.remaining).toBe(API_KEY_RATE_LIMIT_MAX - 2);

    const third = checkApiKeyRateLimit("key-id-1"); // 97
    expect(third.success).toBe(true);
    expect(third.remaining).toBe(API_KEY_RATE_LIMIT_MAX - 3);
  });

  it("returns success:false and remaining:0 after 100 calls", () => {
    for (let i = 0; i < API_KEY_RATE_LIMIT_MAX; i++) {
      checkApiKeyRateLimit("key-id-1");
    }
    const result = checkApiKeyRateLimit("key-id-1");
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("resetAt is a unix timestamp roughly 1 hour in the future", () => {
    const now = Date.now();
    const result = checkApiKeyRateLimit("key-id-1");
    const oneHourMs = 60 * 60 * 1000;

    // resetAt should be approximately now + 1 hour (within a 1-second tolerance)
    expect(result.resetAt).toBeGreaterThanOrEqual(now + oneHourMs - 1000);
    expect(result.resetAt).toBeLessThanOrEqual(now + oneHourMs + 1000);
  });

  it("different apiKeyIds have independent counters", () => {
    // Exhaust key-id-1
    for (let i = 0; i < API_KEY_RATE_LIMIT_MAX; i++) {
      checkApiKeyRateLimit("key-id-1");
    }
    expect(checkApiKeyRateLimit("key-id-1").success).toBe(false);

    // key-id-2 should still have its full quota
    const result = checkApiKeyRateLimit("key-id-2");
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(API_KEY_RATE_LIMIT_MAX - 1);
  });

  it("counter resets after the 1-hour window expires", () => {
    // Exhaust the limit
    for (let i = 0; i < API_KEY_RATE_LIMIT_MAX; i++) {
      checkApiKeyRateLimit("key-id-1");
    }
    expect(checkApiKeyRateLimit("key-id-1").success).toBe(false);

    // Advance time by 1 hour + 1ms to expire the window
    vi.advanceTimersByTime(60 * 60 * 1000 + 1);

    const result = checkApiKeyRateLimit("key-id-1");
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(API_KEY_RATE_LIMIT_MAX - 1);
  });

  it("rate limit max constant is 100", () => {
    expect(API_KEY_RATE_LIMIT_MAX).toBe(100);
  });
});
