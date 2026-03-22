import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { checkRateLimit, resetRateLimitForTesting, RATE_LIMIT_MAX } from "@/lib/rate-limit";

describe("rate-limit", () => {
  beforeEach(() => {
    resetRateLimitForTesting();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows first request from an IP", () => {
    const result = checkRateLimit("1.2.3.4");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(RATE_LIMIT_MAX - 1);
  });

  it("allows up to 5 requests from same IP", () => {
    for (let i = 0; i < 5; i++) {
      const result = checkRateLimit("1.2.3.4");
      expect(result.allowed).toBe(true);
    }
  });

  it("rejects the 6th request from same IP", () => {
    for (let i = 0; i < 5; i++) checkRateLimit("1.2.3.4");
    const result = checkRateLimit("1.2.3.4");
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("tracks different IPs independently", () => {
    for (let i = 0; i < 5; i++) checkRateLimit("1.1.1.1");
    // first IP exhausted, second IP should still be allowed
    const result = checkRateLimit("2.2.2.2");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(RATE_LIMIT_MAX - 1);
  });

  it("resets after 24 hours", () => {
    for (let i = 0; i < 5; i++) checkRateLimit("1.2.3.4");
    expect(checkRateLimit("1.2.3.4").allowed).toBe(false);

    // advance time by 24 hours + 1ms
    vi.advanceTimersByTime(24 * 60 * 60 * 1000 + 1);

    const result = checkRateLimit("1.2.3.4");
    expect(result.allowed).toBe(true);
  });

  it("returns a resetAt Date", () => {
    const result = checkRateLimit("1.2.3.4");
    expect(result.resetAt).toBeInstanceOf(Date);
    expect(result.resetAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("rejects undefined/empty IP", () => {
    const result = checkRateLimit("");
    expect(result.allowed).toBe(false);
  });
});
